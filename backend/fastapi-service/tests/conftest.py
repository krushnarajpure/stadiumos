import os
import sys

# Inject fastapi-service root into python path for tests
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
