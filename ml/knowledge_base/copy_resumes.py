#!/usr/bin/env python3
"""
copy_resumes.py
===============
Copies Paytm and Optum resume PDFs from the Claude session's /tmp folder
into this project directory.

Run once:
    python copy_resumes.py
"""

import shutil
import os
from pathlib import Path

# ── Source (Claude's temp environment) ───────────────────────────────────────
SOURCES = {
    "paytm_resume": Path("/tmp/paytm_resume"),
    "optum_resume": Path("/tmp/optum_resume"),
}

# ── Destination (this project folder) ────────────────────────────────────────
DEST_BASE = Path(__file__).parent  # same folder as this script

def copy_all():
    total = 0
    for folder_name, src_dir in SOURCES.items():
        dest_dir = DEST_BASE / folder_name
        dest_dir.mkdir(exist_ok=True)

        if not src_dir.exists():
            print(f"[SKIP] {src_dir} not found (session may have expired)")
            continue

        pdfs = list(src_dir.glob("*.pdf"))
        print(f"[INFO] Copying {len(pdfs)} PDFs → {dest_dir}")

        for pdf in pdfs:
            shutil.copy2(pdf, dest_dir / pdf.name)
            total += 1

        print(f"  ✅ {folder_name}: {len(pdfs)} files copied")

    print(f"\n✅ Done! {total} total PDFs copied.")
    print("Now run:  cd job_matcher && python train_model.py --data_dir ..")

if __name__ == "__main__":
    copy_all()
