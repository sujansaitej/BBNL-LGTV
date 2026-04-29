import json, urllib.request, urllib.error, ssl, urllib.parse

BASE = "https://netmontest.bbnl.in/netmon/cabletvapis"
H = {
    "Content-Type": "application/json",
    "Authorization": "Basic Zm9maWxhYkBnbWFpbC5jb206MTIzNDUtNTQzMjE=",
    "deviceID": "TV-e118a9a501c8ea3cbaa56edecc9aaa76210c2428",
}

def post(path, body, headers=None, form=False):
    h = dict(headers or H)
    if form:
        h["Content-Type"] = "application/x-www-form-urlencoded"
        data = urllib.parse.urlencode(body).encode()
    else:
        data = json.dumps(body).encode()
    req = urllib.request.Request(BASE + "/" + path, data=data, headers=h, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=20, context=ssl.create_default_context()) as r:
            return r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return "HTTP " + str(e.code) + ": " + e.read().decode("utf-8", "replace")
    except Exception as e:
        return str(type(e).__name__) + ": " + str(e)

print("=== /primarycustdet variations ===")
print("[json, userid only]   :", post("primarycustdet", {"userid": "lgiptvuser"})[:300])
print("[json, +mobile]       :", post("primarycustdet", {"userid": "lgiptvuser", "mobile": "9345364408"})[:300])
print("[form, userid only]   :", post("primarycustdet", {"userid": "lgiptvuser"}, form=True)[:300])
print("[form, +mobile]       :", post("primarycustdet", {"userid": "lgiptvuser", "mobile": "9345364408"}, form=True)[:300])

print()
print("=== /errorimages — full key list ===")
ei = json.loads(post("errorimages", {"userid": "lgiptvuser", "mobile": "9345364408"}))
keys = [list(x.keys())[0] for x in ei.get("errImgs", [])]
print("count:", len(keys))
for k in keys: print("  -", k)

print()
print("=== /ssologin variations ===")
SERIAL = "TV-e118a9a501c8ea3cbaa56edecc9aaa76210c2428"
for dt in ["LG", "LG TV", "LG WebOS"]:
    for mac in ["", "e118a9a501c8", "AA:BB:CC:11:22:33"]:
        body = {"serial_no": SERIAL, "mac_address": mac, "device_name": "LG WebOS", "ip_address": "103.5.132.130", "device_type": dt}
        r = post("ssologin", body)
        print("device_type=" + dt + " mac=" + repr(mac) + ": " + r[:150])

print()
print("=== /chnl_data — full ch[0] ===")
cd = json.loads(post("chnl_data", {"userid": "lgiptvuser", "mobile": "9345364408", "ip_address": "103.5.132.130", "mac_address": ""}))
ch0 = cd["body"][0]
print(json.dumps(ch0, indent=2))

print()
print("=== /chnl_data — chno vs channelno across sample of channels ===")
for c in cd["body"][:5]:
    print("  chid=", c.get("chid"), " chno=", repr(c.get("chno")), " channelno=", repr(c.get("channelno")), " title=", c.get("chtitle"))
print("Channels with non-null chno:", sum(1 for c in cd["body"] if c.get("chno")))
print("Channels with non-null channelno:", sum(1 for c in cd["body"] if c.get("channelno")))

print()
print("=== /streamAds — full body ===")
sa = json.loads(post("streamAds", {"userid": "lgiptvuser", "mobile": "9345364408", "ip_address": "103.5.132.130", "mac_address": "", "grid": "1", "chid": "1907"}))
print(json.dumps(sa, indent=2))

print()
print("=== /iptvads — full body ===")
ia = json.loads(post("iptvads", {"userid": "lgiptvuser", "mobile": "9345364408", "adclient": "fofi", "srctype": "image", "displayarea": "homepage", "displaytype": ""}))
print(json.dumps(ia, indent=2))

print()
print("=== /allowedapps — full apps list ===")
aa = json.loads(post("allowedapps", {"userid": "lgiptvuser", "mobile": "9345364408", "ip_address": "103.5.132.130", "mac": ""}))
print(json.dumps(aa, indent=2))

print()
print("=== /oyo_chnl_video — full body ===")
oyo = json.loads(post("oyo_chnl_video", {"userid": "lgiptvuser", "mobile": "9345364408", "respkey": "Channels"}))
print(json.dumps(oyo, indent=2)[:2000])
