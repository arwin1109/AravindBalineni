import os
import requests

# Target folder inside your project
target_folder = r"d:\Workspace\Portfolio\developer-portfolio\app\assets\svg\skills"
os.makedirs(target_folder, exist_ok=True)

# List of icons (filename : URL)
icons = {
    "salesforce.svg": "https://cdn.simpleicons.org/salesforce",
    "sqlalchemy.svg": "https://cdn.simpleicons.org/sqlalchemy",
    "fastapi.svg": "https://cdn.simpleicons.org/fastapi",
    "jira.svg": "https://cdn.simpleicons.org/jira",
    "kibana.svg": "https://cdn.simpleicons.org/kibana",
    "uipath.svg": "https://cdn.simpleicons.org/uipath",
    "jenkins.svg": "https://cdn.simpleicons.org/jenkins",
    "flask.svg": "https://cdn.simpleicons.org/flask",
    "servicenow.svg": "https://cdn.simpleicons.org/servicenow",
    "sap.svg": "https://cdn.simpleicons.org/sap",
    "oracle.svg": "https://cdn.simpleicons.org/oracle",
    "excel.svg": "https://cdn.simpleicons.org/microsoftexcel",
    "pdf.svg": "https://cdn.simpleicons.org/adobeacrobatreader",
}

# Download SVGs into project folder
for name, url in icons.items():
    print(f"⬇️ Downloading {name}...")
    try:
        r = requests.get(url, timeout=10)
        if r.status_code == 200:
            with open(os.path.join(target_folder, name), "wb") as f:
                f.write(r.content)
        else:
            print(f"⚠️ Failed to download {name} (status {r.status_code})")
    except Exception as e:
        print(f"❌ Error downloading {name}: {e}")

print(f"✅ Done! All icons saved in {target_folder}")
