import json, urllib.request, urllib.error, ssl, os

BASE = "https://netmontest.bbnl.in/netmon/cabletvapis"
DEVICE_ID = "TV-e118a9a501c8ea3cbaa56edecc9aaa76210c2428"
USERID = "lgiptvuser"
MOBILE = "9345364408"
IP = "103.5.132.130"
MAC = ""

HEADERS = {
    "Content-Type": "application/json",
    "Authorization": "Basic Zm9maWxhYkBnbWFpbC5jb206MTIzNDUtNTQzMjE=",
    "deviceID": DEVICE_ID,
}

OUT = "/tmp/bbnl-probe"
os.makedirs(OUT, exist_ok=True)

def post(name, path, body):
    url = f"{BASE}/{path}"
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers=HEADERS, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=20, context=ssl.create_default_context()) as resp:
            data = resp.read()
            try: parsed = json.loads(data)
            except: parsed = data.decode("utf-8", "replace")
            with open(os.path.join(OUT, name + ".json"), "w") as f:
                json.dump({"path": path, "status": resp.status, "request": body, "response": parsed}, f, indent=2)
            return parsed
    except urllib.error.HTTPError as e:
        body_s = e.read().decode("utf-8", "replace")
        with open(os.path.join(OUT, name + ".json"), "w") as f:
            json.dump({"path": path, "status": e.code, "request": body, "error_body": body_s}, f, indent=2)
        return {"_http_error": e.code, "_body": body_s}
    except Exception as e:
        return {"_err": str(type(e).__name__) + ": " + str(e)}

def short(r):
    if isinstance(r, dict):
        st = r.get("status", {})
        msg = st.get("err_msg") if isinstance(st, dict) else "?"
        code = st.get("err_code") if isinstance(st, dict) else "?"
        body = r.get("body")
        body_kind = "list" if isinstance(body, list) else "dict" if isinstance(body, dict) else type(body).__name__
        body_len = len(body) if isinstance(body, (list, dict)) else "n/a"
        return "err_code=" + str(code) + "  msg=" + repr(msg) + "  body=" + body_kind + "(" + str(body_len) + ")"
    return str(r)[:200]

# 1. applock
r = post("02-applock", "applock", {"userid": USERID, "mobile": MOBILE, "ip_address": IP, "appversion": "2.0.0"})
print("APPLOCK         :", short(r))
if isinstance(r, dict) and isinstance(r.get("body"), dict):
    print("                  body keys:", list(r["body"].keys()))

# 2. fofitv_logo
r = post("03-logo", "fofitv_logo", {})
print("LOGO            :", short(r))
if isinstance(r, dict) and isinstance(r.get("body"), dict):
    print("                  logo_path:", str(r["body"].get("logo_path"))[:80])

# 3. appversion
r = post("04-appversion", "appversion", {
    "userid": USERID, "mobile": MOBILE, "ip_address": IP, "device_type": "LG TV",
    "mac_address": MAC, "device_name": "LG TV", "app_package": "com.lgiptv.bbnl"})
print("APPVERSION      :", short(r))
if isinstance(r, dict) and isinstance(r.get("body"), dict):
    b = r["body"]
    print("                  appversion=", repr(b.get("appversion")), " link=", str(b.get("appdwnldlink"))[:60])

# 4. errorimages
r = post("05-errorimages", "errorimages", {"userid": USERID, "mobile": MOBILE})
ei = r.get("errImgs") if isinstance(r, dict) else None
print("ERRORIMAGES     : err_code=", r.get("status",{}).get("err_code") if isinstance(r,dict) else "?", " errImgs=", len(ei) if isinstance(ei,list) else "n/a")
if isinstance(ei, list) and ei:
    keys = [list(x.keys())[0] for x in ei[:8]]
    print("                  first keys:", keys)

# 5. chnl_categlist
r = post("06-chnl_categlist", "chnl_categlist", {"userid": USERID, "mobile": MOBILE})
cats = r.get("body", [{}])[0].get("categories") if isinstance(r, dict) and r.get("body") else None
print("CHNL_CATEGLIST  :", short(r), " categories:", len(cats) if isinstance(cats,list) else "n/a")
if isinstance(cats, list) and cats:
    print("                  cat[0] keys:", list(cats[0].keys())[:15])

# 6. chnl_langlist
r = post("07-chnl_langlist", "chnl_langlist", {"userid": USERID, "mobile": MOBILE})
langs = r.get("body", [{}])[0].get("languages") if isinstance(r, dict) and r.get("body") else None
print("CHNL_LANGLIST   :", short(r), " languages:", len(langs) if isinstance(langs,list) else "n/a")

# 7. chnl_data
r = post("08-chnl_data", "chnl_data", {"userid": USERID, "mobile": MOBILE, "ip_address": IP, "mac_address": MAC})
chans = r.get("body") if isinstance(r, dict) else None
print("CHNL_DATA       :", short(r), " channels:", len(chans) if isinstance(chans,list) else "n/a")
first_chid = first_grid = first_chno = None
if isinstance(chans, list) and chans and isinstance(chans[0], dict):
    c0 = chans[0]
    first_chid = c0.get("chid")
    first_grid = c0.get("grid")
    first_chno = c0.get("chno")
    print("                  ch[0] chid=", first_chid, " grid=", first_grid, " chno=", first_chno, " title=", str(c0.get("chtitle",""))[:30])
    print("                  ch[0] keys:", sorted(list(c0.keys()))[:25])
    if c0.get("streamlink"):
        print("                  ch[0] streamlink:", str(c0.get("streamlink"))[:80])

# 8. expiringchnl_list
r = post("09-expiringchnl_list", "expiringchnl_list", {"userid": USERID, "mobile": MOBILE, "grid": "", "bcid": "", "langid": ""})
b = r.get("body") if isinstance(r, dict) else None
exp = b[0].get("channels") if isinstance(b, list) and b and isinstance(b[0], dict) else None
print("EXPIRINGCHNL    :", short(r), " expiring:", len(exp) if isinstance(exp,list) else "n/a")

# 9. iptvads
r = post("10-iptvads", "iptvads", {"userid": USERID, "mobile": MOBILE, "adclient": "fofi", "srctype": "image", "displayarea": "homepage", "displaytype": ""})
print("IPTVADS         :", short(r))

# 10. allowedapps
r = post("11-allowedapps", "allowedapps", {"userid": USERID, "mobile": MOBILE, "ip_address": IP, "mac": MAC})
apps = r.get("apps") if isinstance(r, dict) else None
print("ALLOWEDAPPS     : err_code=", r.get("status",{}).get("err_code") if isinstance(r,dict) else "?", " apps=", len(apps) if isinstance(apps,list) else "n/a")
if isinstance(apps, list) and apps:
    print("                  apps[0] keys:", list(apps[0].keys()))
    print("                  apps[0]:", json.dumps(apps[0])[:160])

# 11. primarycustdet
r = post("12-primarycustdet", "primarycustdet", {"userid": USERID})
print("PRIMARYCUSTDET  :", short(r))
if isinstance(r, dict) and isinstance(r.get("body"), list) and r["body"]:
    print("                  body[0]:", json.dumps(r["body"][0])[:200])

# 12. trpdata
if first_chid:
    r = post("13-trpdata", "trpdata", {"userid": USERID, "mobile": MOBILE, "ip_address": IP, "chid": first_chid})
    print("TRPDATA         :", short(r))
else:
    print("TRPDATA         : SKIPPED (no chid)")

# 13. stream
if first_chid:
    r = post("14-stream", "stream", {"userid": USERID, "mobile": MOBILE, "chid": first_chid, "chno": "", "ip_address": IP, "mac_address": MAC})
    print("STREAM          :", short(r))
    if isinstance(r, dict) and isinstance(r.get("body"), list) and r["body"]:
        s = r["body"][0].get("stream", [{}])[0] if isinstance(r["body"][0].get("stream"), list) else {}
        print("                  stream[0] keys:", list(s.keys())[:20])
        print("                  streamlink:", str(s.get("streamlink"))[:80])
else:
    print("STREAM          : SKIPPED")

# 14. streamAds
if first_chid and first_grid is not None:
    r = post("15-streamAds", "streamAds", {"userid": USERID, "mobile": MOBILE, "ip_address": IP, "mac_address": MAC, "grid": str(first_grid), "chid": str(first_chid)})
    print("STREAMADS       :", short(r))
    if isinstance(r, dict) and isinstance(r.get("body"), dict):
        print("                  body keys:", list(r["body"].keys()))
else:
    print("STREAMADS       : SKIPPED")

# 15. ottscreenbgs
r = post("16-ottscreenbgs", "ottscreenbgs", {"bgclient": "fofi", "srctype": "image", "displayarea": "login"})
print("OTTSCREENBGS    :", short(r))

# 16. ssologin
r = post("17-ssologin", "ssologin", {"serial_no": DEVICE_ID, "mac_address": MAC, "device_name": "LG WebOS", "ip_address": IP, "device_type": "LG"})
print("SSOLOGIN        :", short(r))

# 17. Oyo endpoints
for label, path, body in [
    ("OYO_MEDIACATEGS", "oyo_mediacategs", {"userid": USERID, "mobile": MOBILE}),
    ("OYO_CHNL_VIDEO ", "oyo_chnl_video", {"userid": USERID, "mobile": MOBILE, "respkey": "Channels"}),
    ("OYO_ADS        ", "oyoads", {"userid": USERID, "mobile": MOBILE, "appclient": "oyo"}),
]:
    r = post("oyo-" + path, path, body)
    print(label, ":", short(r))

print()
print("=" * 60)
print("All payloads saved to /tmp/bbnl-probe/")
