#!/usr/bin/env python3
import subprocess
import os
import sys

os.environ['GIT_EDITOR'] = 'nul'
os.environ['GIT_SEQUENCE_EDITOR'] = 'nul'

repo_path = r"c:\Users\Josie O. Banalo\Desktop\myfiles\SE\software-engineering-system"
os.chdir(repo_path)

print("=" * 60)
print("ADVISER FIX - FINAL PUSH TO GITHUB")
print("=" * 60)

try:
    print("\n[1/5] Checking status...")
    result = subprocess.run(['git', 'status'], capture_output=True, text=True)
    print(result.stdout)
    
    print("[2/5] Adding all changes...")
    subprocess.run(['git', 'add', '-A'], check=True)
    print("✓ Added")
    
    print("[3/5] Committing...")
    subprocess.run([
        'git', 'commit', '-m', 
        'URGENT: Fix adviser data - gradeLevel/section matching, teacherControllerFile, error handling'
    ], check=True)
    print("✓ Committed")
    
    print("[4/5] Pulling latest changes...")
    subprocess.run(['git', 'pull', 'origin', 'main', '--no-edit'], check=False)
    print("✓ Pulled")
    
    print("[5/5] Pushing to GitHub...")
    result = subprocess.run(['git', 'push', 'origin', 'main', '-v'], capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print(result.stderr)
    
    if result.returncode == 0:
        print("\n" + "=" * 60)
        print("✓ SUCCESS! Code pushed to GitHub!")
        print("=" * 60)
        print("\nProduction rebuilding in 1-2 minutes...")
        print("Then visit: https://deployed-ils-wmsu.vercel.app/admin/assign-adviser")
    else:
        print("\n✗ Push failed - return code:", result.returncode)
        print("STDERR:", result.stderr)
    
except Exception as e:
    print(f"\n✗ Error: {e}")
    sys.exit(1)
