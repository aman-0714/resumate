#!/usr/bin/env python3
"""
organise_resumes.py
===================
Moves PDFs from the root aaaaaa/ folder into:
  paytm_resume/   ← files that were ALL_CAPS (from Paytm zip)
  optum_resume/   ← files that were Title/lowercase (from Optum zip)

Run:
    python organise_resumes.py
"""

import os
import shutil
from pathlib import Path

BASE = Path(__file__).parent

# Paytm filenames were ALL CAPS (e.g. ABHAY_NOSRAN.pdf)
# Optum filenames were TitleCase / lowercase (e.g. Abhay.pdf, sachin.pdf)

# Known Paytm filenames from the zip (ALL CAPS originals)
PAYTM_FILES = {
    "ABHAY_NOSRAN.pdf","ABHAY_SHRIVASTAVA.pdf","ABHINAV.pdf","ABHINAV_ANAND.pdf",
    "ABHISHEK_KUMAR.pdf","ABHISHEK_SINGH.pdf","ACHYUT_GUPTA.pdf","ADITI_SRIVASTAVA.pdf",
    "ADITYA_HARSH.pdf","ADITYA_KUMAR.pdf","ADITYA_MAJUMDAR.pdf","ADITYA_YADAV.pdf",
    "AJIT_SINGH.pdf","ALLEN_VARUGHESE_JOHN.pdf","ALOK_KUMAR.pdf","AMAN_KUMAR.pdf",
    "AMAN_KUMAR_JHA.pdf","AMOLPREET_SINGH.pdf","ANIKET.pdf","ANSHU_YADAV.pdf",
    "ANSH_GOYAL.pdf","ANTHARVEDI_SANDEEP.pdf","ANUJ_KUMAR_SONI.pdf","ANUJ_SAINI.pdf",
    "ANUPAM.pdf","ANURAG_SINGH.pdf","ARCHIT_AGGARWAL.pdf","ARMAN_SINGLA.pdf",
    "ARVINDER_SINGH.pdf","ARYAN.pdf","ARYAN_2.pdf","ARYAN_ASHISH_YADAV.pdf",
    "ASHISH.pdf","ASHISH_ROLAN.pdf","ASHWANI.pdf","ASJAD_ALLI_KHAN.pdf",
    "AVNISH_SHARMA.pdf","AYUSHI_MAURYA.pdf","BANOTHU_GOPI_CHAND.pdf","CHAHAT.pdf",
    "DEEPANSHU_RANA.pdf","DIKSHA_SINGLA.pdf","DINESH_KUMAR.pdf","DINESH_KUMAR_KATARIA.pdf",
    "GANDLA_SAI_SHIVANI.pdf","GARVIT.pdf","GAURANG_GARG.pdf","GOPI_RAMAN.pdf",
    "GURJOT_SINGH_BAJAJ.pdf","GURNAJ_SINGH_MANN.pdf","HARIKA_KATAKAM.pdf","HARMAN_PAUL.pdf",
    "HARSAHIB_SINGH_SANDHU.pdf","HARSHAD_BAJIRAO_KURADE.pdf","HARSHIT_GAUTAM.pdf",
    "HARSHIT_MAURYA.pdf","HARSHIT_SEDHA.pdf","HARSH_PAL.pdf","HEMANT_SINGH_PIPCHANOT.pdf",
    "HIMANSHU_SHARMA.pdf","HIYA_CHOWDHRY.pdf","ISHA_NANDA.pdf","JAGNOOR_SINGH.pdf",
    "JAGNOOR_SINGH_MAROK.pdf","JASKARAN_SINGH_KHOKHAR.pdf","JATIN_GUPTA.pdf",
    "JATIN_SINGLA.pdf","JITESH_BANSAL.pdf","KAJAL_KUMARI.pdf","KAMLESH_KUMAR.pdf",
    "KANAV_GOYAL.pdf","KAPILA_CHANAKYA_NAGA_SAI_VEERA_AOWSHITH.pdf","KARDALE_PREM_KUMAR.pdf",
    "KAVY_JAISWAL.pdf","KOMALPREET_SINGH.pdf","KUNAL_JINDAL.pdf","LAVISH_MAHAJAN.pdf",
    "LAXAY.pdf","MANISHA_MEENA.pdf","MANISH_KUMAR.pdf","MANISH_RAGHAV.pdf",
    "MANVIR_KATARIA.pdf","MANYA_ARORA.pdf","MD_SHAHNAWAZ_HASSAN.pdf","MOHIT_GUPTA.pdf",
    "MOHNISH_KUMAR_SINGH.pdf","MS_KOMAL_AGARWAL.pdf","MUKKAPATI_AMARANATH.pdf","MUSKAN.pdf",
    "NAMAN_TRIPATHI.pdf","NIDHI_HEER.pdf","NIKHIL_JINDAL.pdf","NIKITA.pdf",
    "NIRVAN_CHOPRA.pdf","NISHANT_GARG.pdf","NISHANT_JAIN.pdf","NITISH_KUMAR.pdf",
    "NITYA_NANDNI.pdf","PINKI_KUMARI.pdf","PRAGATI_AGGARWAL.pdf","PRANAY_GUPTA.pdf",
    "PRERAK_SINGLA.pdf","PRITAM.pdf","PRIYANSH_MUNDRA.pdf","PRIYA_SAXENA.pdf",
    "RAGHAV_GOYAL.pdf","RAJDEEP_CHAKRABORTY.pdf","RAVI_CHAHAR.pdf","ROHIT_SHARMA.pdf",
    "ROPAKSHI.pdf","SAHIL.pdf","SAKSHI.pdf","SAMEER_PAREEK.pdf","SAMIKSHA.pdf",
    "SAMREET_KAUR.pdf","SANDEEP_SIMRAN_SAHOO.pdf","SAURABH_SAHU.pdf","SAURAV_KUMAR.pdf",
    "SHAILESH_KUMAR.pdf","SHEETAL_MEHAN.pdf","SHIVAM_SINGLA.pdf","SHREYA.pdf",
    "SHREYAN_BADYAL.pdf","SHREYAS_DATTA.pdf","SHUBHAMDEEP_SINGH.pdf","SHUBHAM_NANDA.pdf",
    "SHUBHI_GULATI.pdf","SIMARJIT_SINGH.pdf","SIMRAT_KAUR.pdf","SOURAV_KUMAR_VERMA.pdf",
    "SUHANI_JAGOTRA.pdf","SUJAL_KUMAR.pdf","SUMIT_CHAUHAN.pdf","SURBHI_TIWARI.pdf",
    "SUSHANT_BANSAL.pdf","SUSHANT_YADAV.pdf","TANISHKA.pdf","TARANJEET_KAUR.pdf",
    "TISHA_SINGLA.pdf","UTKARSH_TRIPATHI.pdf","VANDANA_SAH.pdf","VANSH_UPPAL.pdf",
    "VANYA_KATARIA.pdf","YASH_AGARWAL.pdf","YUVRAJ_SINGH_HADA.pdf",
}

def organise():
    paytm_dir = BASE / "paytm_resume"
    optum_dir = BASE / "optum_resume"
    paytm_dir.mkdir(exist_ok=True)
    optum_dir.mkdir(exist_ok=True)

    pdfs = list(BASE.glob("*.pdf"))
    paytm_count = optum_count = skipped = 0

    for pdf in pdfs:
        name = pdf.name
        if name == "g_resume.pdf":   # your own test resume — skip
            skipped += 1
            continue

        if name in PAYTM_FILES:
            dest = paytm_dir / name
            shutil.move(str(pdf), str(dest))
            paytm_count += 1
        else:
            dest = optum_dir / name
            shutil.move(str(pdf), str(dest))
            optum_count += 1

    print(f"✅ Done!")
    print(f"   paytm_resume/ : {paytm_count} files")
    print(f"   optum_resume/ : {optum_count} files")
    print(f"   skipped       : {skipped} files (g_resume.pdf kept in root)")
    print(f"\nNow run:")
    print(f"   cd job_matcher")
    print(f"   pip install -r requirements.txt")
    print(f"   python train_model.py --data_dir ..")

if __name__ == "__main__":
    organise()
