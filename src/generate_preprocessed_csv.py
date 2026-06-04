"""
Generate a preprocessed CSV from the enriched input CSV.
Creates `data/top_github_repos_enriched_preprocessed.csv` at repository root.
"""
import os
import sys

import numpy as np
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DF_PATH = os.path.join(ROOT, "data", "top_github_repos_enriched.csv")

if not os.path.exists(DF_PATH):
    sys.stderr.write(f"File not found: {DF_PATH}\n")
    sys.exit(2)

df = pd.read_csv(DF_PATH)
req_cols = [
    "repo_project",
    "primary_language",
    "language_entropy",
    "num_languages_total",
    "total_content_size",
    "binary_ratio",
]
df = df.dropna(subset=req_cols)

for src_col, dst_col in [
    ("watch_count", "log_watch"),
    ("file_rows", "log_files"),
    ("total_content_size", "log_size"),
]:
    if src_col in df.columns:
        df[dst_col] = np.log1p(df[src_col]).round(4)

out_dir = os.path.join(ROOT, "data")
os.makedirs(out_dir, exist_ok=True)
out_path = os.path.join(out_dir, "top_github_repos_enriched_preprocessed.csv")
df.to_csv(out_path, index=False)
