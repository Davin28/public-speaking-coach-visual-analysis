"""Visual analysis module for the Public Speaking Coach.

Requires: opencv-python, mediapipe (legacy solutions API), numpy.
Supports webcam preview and video-file analysis.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2
import mediapipe as mp


class VisualAnalyzer:


    def __init__(self, sample_every: int = 3):
        if sample_every < 1:
            raise ValueError("sample_every must be >= 1")
        self.sample_every = sample_every
        self.pose = mp.solutions.pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)
        self.face = mp.solutions.face_mesh.FaceMesh(max_num_faces=1, refine_landmarks=False,
                                                    min_detection_confidence=0.5,
                                                    min_tracking_confidence=0.5)
        self.hands = mp.solutions.hands.Hands(max_num_hands=2, min_detection_confidence=0.5,
                                              min_tracking_confidence=0.5)
        self.reset()

    def reset(self):
        self.frames_sampled = 0
        self.face_frames = 0
        self.camera_facing_frames = 0
        self.camera_facing_valid_frames = 0
        self.posture_frames = 0
        self.level_shoulder_frames = 0
        self.hand_frames = 0
        self.hand_motion_sum = 0.0
        self.hand_motion_samples = 0
        self.previous_hand_center = None

    def analyze_frame(self, frame):
        """Process a BGR frame and return per-frame indicators."""
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        face_result = self.face.process(rgb)
        pose_result = self.pose.process(rgb)
        hands_result = self.hands.process(rgb)
        self.frames_sampled += 1
        result = {"face_detected": False, "camera_facing_estimate": None,
                  "shoulders_level_estimate": None, "hands_detected": 0}

        if face_result.multi_face_landmarks:
            self.face_frames += 1
            result["face_detected"] = True
            landmarks = face_result.multi_face_landmarks[0].landmark

            left, right, nose = landmarks[33], landmarks[263], landmarks[1]
            eye_span = abs(right.x - left.x)
            if eye_span > 0.01:
                midpoint = (left.x + right.x) / 2
                self.camera_facing_valid_frames += 1
                facing = abs(nose.x - midpoint) / eye_span < 0.18
                result["camera_facing_estimate"] = facing
                if facing:
                    self.camera_facing_frames += 1

        if pose_result.pose_landmarks:
            pts = pose_result.pose_landmarks.landmark
            left = pts[mp.solutions.pose.PoseLandmark.LEFT_SHOULDER]
            right = pts[mp.solutions.pose.PoseLandmark.RIGHT_SHOULDER]
            if left.visibility > 0.6 and right.visibility > 0.6:
                span = abs(left.x - right.x)
                if span > 0.05:
                    self.posture_frames += 1
                    level = abs(left.y - right.y) / span < 0.15
                    result["shoulders_level_estimate"] = level
                    if level:
                        self.level_shoulder_frames += 1

        if hands_result.multi_hand_landmarks:
            count = len(hands_result.multi_hand_landmarks)
            self.hand_frames += 1
            result["hands_detected"] = count
            centers = []
            for hand in hands_result.multi_hand_landmarks:
                wrist = hand.landmark[0]
                centers.append((wrist.x, wrist.y))
            center = (sum(x for x, _ in centers) / count,
                      sum(y for _, y in centers) / count)
            if self.previous_hand_center is not None:
                dx = center[0] - self.previous_hand_center[0]
                dy = center[1] - self.previous_hand_center[1]
                self.hand_motion_sum += (dx * dx + dy * dy) ** 0.5
                self.hand_motion_samples += 1
            self.previous_hand_center = center
        else:
            self.previous_hand_center = None
        return result

    def get_results(self):
        def pct(n, d):
            return round(100 * n / d, 1) if d else None
        return {
            "sampled_frames": self.frames_sampled,
            "camera_facing_valid_frames": self.camera_facing_valid_frames,
            "shoulder_valid_frames": self.posture_frames,
            "face_detected_percent": pct(self.face_frames, self.frames_sampled),
            "camera_facing_percent": pct(self.camera_facing_frames, self.camera_facing_valid_frames),
            "level_shoulders_percent": pct(self.level_shoulder_frames, self.posture_frames),
            "hands_visible_percent": pct(self.hand_frames, self.frames_sampled),
            "average_hand_motion_per_sample": (
                round(self.hand_motion_sum / self.hand_motion_samples, 4)
                if self.hand_motion_samples else None),
            "notes": [
                "Camera-facing is estimated from head orientation, not actual eye gaze.",
                "Shoulder alignment is not a complete assessment of posture.",
                "Hand motion is normalized image displacement, not gesture quality."
            ]
        }

    def analyze_video(self, source, preview=False, max_frames=None):
        """Analyze a video path or webcam index (0). Press q to stop preview."""
        self.reset()
        capture = cv2.VideoCapture(source)
        if not capture.isOpened():
            raise RuntimeError(f"Could not open video source: {source}")
        frame_number = 0
        try:
            while True:
                ok, frame = capture.read()
                if not ok:
                    break
                frame_number += 1
                if frame_number % self.sample_every == 0:
                    indicators = self.analyze_frame(frame)
                    if preview:
                        text = f"Face: {indicators['face_detected']}  Hands: {indicators['hands_detected']}"
                        cv2.putText(frame, text, (15, 30), cv2.FONT_HERSHEY_SIMPLEX,
                                    0.7, (0, 255, 0), 2)
                if preview:
                    cv2.imshow("Visual Analyzer - press q to stop", frame)
                    if cv2.waitKey(1) & 0xFF == ord('q'):
                        break
                if max_frames is not None and frame_number >= max_frames:
                    break
        finally:
            capture.release()
            if preview:
                cv2.destroyAllWindows()
        return self.get_results()

    def close(self):
        self.pose.close()
        self.face.close()
        self.hands.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()


def main():
    parser = argparse.ArgumentParser(description="Analyze visual speaking behavior")
    parser.add_argument("--video", help="Path to video file; omit to use webcam")
    parser.add_argument("--preview", action="store_true", help="Show webcam/video window")
    parser.add_argument("--sample-every", type=int, default=3)
    parser.add_argument("--output", default="visual_results.json")
    args = parser.parse_args()
    source = str(Path(args.video)) if args.video else 0
    with VisualAnalyzer(sample_every=args.sample_every) as analyzer:
        results = analyzer.analyze_video(source, preview=args.preview)
    Path(args.output).write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(json.dumps(results, indent=2))
    print(f"Saved results to {args.output}")


if __name__ == "__main__":
    main()
