"""Unit tests for result aggregation; no webcam or MediaPipe runtime needed."""
import unittest
from unittest.mock import patch
import sys
from pathlib import Path
from types import SimpleNamespace
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Mock heavy runtime dependencies so tests can check result math without a webcam.
with patch.dict(sys.modules, {"cv2": SimpleNamespace(), "mediapipe": SimpleNamespace()}):
    from visual_analyzer import VisualAnalyzer

class ResultsTests(unittest.TestCase):
    def test_empty_results(self):
        analyzer = VisualAnalyzer.__new__(VisualAnalyzer)
        analyzer.reset()
        results = analyzer.get_results()
        self.assertEqual(results["sampled_frames"], 0)
        self.assertIsNone(results["camera_facing_percent"])

    def test_percentages(self):
        analyzer = VisualAnalyzer.__new__(VisualAnalyzer)
        analyzer.reset()
        analyzer.frames_sampled = 10
        analyzer.face_frames = 8
        analyzer.camera_facing_valid_frames = 4
        analyzer.camera_facing_frames = 3
        analyzer.posture_frames = 5
        analyzer.level_shoulder_frames = 4
        analyzer.hand_frames = 6
        results = analyzer.get_results()
        self.assertEqual(results["face_detected_percent"], 80.0)
        self.assertEqual(results["camera_facing_percent"], 75.0)
        self.assertEqual(results["level_shoulders_percent"], 80.0)
        self.assertEqual(results["hands_visible_percent"], 60.0)

if __name__ == "__main__":
    unittest.main()
