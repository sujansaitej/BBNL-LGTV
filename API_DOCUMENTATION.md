# BBNL IPTV Public API Documentation

## Overview

- **API Name:** BBNL IPTV Public API
- **Version:** 1.0.0
- **Base URL:** http://124.40.244.211/netmon/cabletvapis
- **Authentication:** Basic Auth header + device serial
- **Backend:** External (not included in this repo)
- **Database:** Not exposed (API only)
- **Environment:** Production

### Purpose
Provides authentication, channel, and ad data for the BBNL IPTV web app.

### Use Cases
- User login via OTP
- Fetching live TV channels and categories
- Fetching IPTV ads

### Target Users
- Frontend developers integrating with BBNL IPTV
- QA and support teams

---

## Architecture Overview

### High-Level System Architecture
- Client (React Web App)
- BBNL IPTV API Server (external)

### Components
- Authentication (OTP)
- Channel Data
- Ads Data

### Request–Response Lifecycle
1. Client sends HTTP request (axios)
2. API server authenticates via headers
3. API processes and returns JSON

### ASCII Architecture Diagram
```
+---------+      +-------------------+
|  Client | <--> | BBNL IPTV API     |
+---------+      +-------------------+
```

---

## Authentication & Authorization

### Flow
- Client includes Basic Auth and device headers in every request

### Required Headers
| Header Name      | Value (example)                |
|------------------|-------------------------------|
| Authorization    | Basic Zm9maWxhYkBnbWFpbC5jb206MTIzNDUtNTQzMjE= |
| Content-Type     | application/json              |
| devslno          | FOFI20191129000336            |

### Example Request
```http
POST /login HTTP/1.1
Host: 124.40.244.211
Authorization: Basic Zm9maWxhYkBnbWFpbC5jb206MTIzNDUtNTQzMjE=
Content-Type: application/json
devslno: FOFI20191129000336

{"userid": "testiser1", "mobile": "7800000001"}
```

### Example Response
```json
{
  "status": { "err_code": 0, "err_msg": "OTP sent successfully" },
  "userid": "testiser1"
}
```

---

## API Workflow

### Step-by-Step
1. Client sends request with headers and payload
2. API validates headers and payload
3. Business logic (auth, fetch data)
4. Response returned

### ASCII Workflow Diagram
```
Client -> [API Server] -> [Business Logic] -> [Response]
```

---

## API Endpoints Documentation

### 1. Login (Send OTP)
| Name         | Value                |
|--------------|----------------------|
| Method       | POST                 |
| URL          | /login               |
| Headers      | Authorization, Content-Type, devslno |

#### Request Body
```json
{
  "userid": "testiser1",
  "mobile": "7800000001"
}
```

#### Response Body
```json
{
  "status": { "err_code": 0, "err_msg": "OTP sent successfully" },
  "userid": "testiser1"
}
```

#### cURL Example
```sh
curl -X POST \
  -H "Authorization: Basic Zm9maWxhYkBnbWFpbC5jb206MTIzNDUtNTQzMjE=" \
  -H "Content-Type: application/json" \
  -H "devslno: FOFI20191129000336" \
  -d '{"userid":"testiser1","mobile":"7800000001"}' \
  http://124.40.244.211/netmon/cabletvapis/login
```

#### JavaScript Example (axios)
```js
axios.post('http://124.40.244.211/netmon/cabletvapis/login', {
  userid: 'testiser1',
  mobile: '7800000001'
}, {
  headers: {
    'Authorization': 'Basic Zm9maWxhYkBnbWFpbC5jb206MTIzNDUtNTQzMjE=',
    'Content-Type': 'application/json',
    'devslno': 'FOFI20191129000336'
  }
});
```

---

### 2. Verify OTP
| Name         | Value                |
|--------------|----------------------|
| Method       | POST                 |
| URL          | /loginOtp            |
| Headers      | Authorization, Content-Type, devslno |

#### Request Body
```json
{
  "userid": "testiser1",
  "mobile": "7800000001",
  "otpcode": "1234"
}
```

#### Response Body
```json
{
  "status": { "err_code": 0, "err_msg": "Authentication successful!" },
  "userid": "testiser1"
}
```

#### cURL Example
```sh
curl -X POST \
  -H "Authorization: Basic Zm9maWxhYkBnbWFpbC5jb206MTIzNDUtNTQzMjE=" \
  -H "Content-Type: application/json" \
  -H "devslno: FOFI20191129000336" \
  -d '{"userid":"testiser1","mobile":"7800000001","otpcode":"1234"}' \
  http://124.40.244.211/netmon/cabletvapis/loginOtp
```

---

### 3. Get Channel Categories
| Name         | Value                |
|--------------|----------------------|
| Method       | POST                 |
| URL          | /chnl_categlist      |
| Headers      | Authorization, Content-Type, devslno |

#### Request Body
```json
{
  "userid": "testiser1",
  "mobile": "7800000001",
  "ip_address": "192.168.101.110",
  "mac_address": "68:1D:EF:14:6C:21"
}
```

#### Response Body
```json
{
  "status": { "err_code": 0, "err_msg": "Success" },
  "body": [
    {
      "categories": [
        { "grtitle": "News", "grid": 1 },
        { "grtitle": "Movies", "grid": 2 }
      ]
    }
  ]
}
```

---

### 4. Get Channels
| Name         | Value                |
|--------------|----------------------|
| Method       | POST                 |
| URL          | /chnl_data           |
| Headers      | Authorization, Content-Type, devslno |

#### Request Body
```json
{
  "userid": "testiser1",
  "mobile": "7800000001",
  "ip_address": "192.168.101.110",
  "mac_address": "68:1D:EF:14:6C:21"
}
```

#### Response Body
```json
{
  "status": { "err_code": 0, "err_msg": "Success" },
  "body": [
    {
      "chnl_id": 1,
      "chnl_name": "BBC News",
      "logo": "http://...",
      "subscribed": "yes",
      "streamlink": "http://..."
    }
  ]
}
```

---

### 5. Get IPTV Ads
| Name         | Value                |
|--------------|----------------------|
| Method       | POST                 |
| URL          | /iptvads             |
| Headers      | Authorization, Content-Type, devslno |

#### Request Body (JSON or Form)
```json
{
  "userid": "testiser1",
  "mobile": "7800000001",
  "adclient": "fofi",
  "srctype": "image",
  "displayarea": "homepage",
  "displaytype": "",
  "ip_address": "192.168.101.110",
  "mac_address": "68:1D:EF:14:6C:21"
}
```

#### Response Body
```json
{
  "status": { "err_code": 0, "err_msg": "Success" },
  "body": [
    { "adpath": "http://.../ad1.jpg" },
    { "adpath": "http://.../ad2.jpg" }
  ]
}
```

---

## Request & Response Format

### Standard Request
- JSON body (see above)
- Required headers (see above)

### Standard Success Response
```json
{
  "status": { "err_code": 0, "err_msg": "Success" },
  "body": [ ... ]
}
```

### Standard Error Response
```json
{
  "status": { "err_code": 1, "err_msg": "Error message" }
}
```

---

## Error Handling

### Error Codes
| Code | Message                |
|------|------------------------|
| 0    | Success                |
| 1    | General Error          |
| 2    | Invalid Credentials    |
| ...  | (API-specific)         |

### Error Response Format
```json
{
  "status": { "err_code": 1, "err_msg": "Error message" }
}
```

---

## Validation Rules
- All fields required unless noted
- `mobile` must be a valid 10-digit number
- `otpcode` must be 4 digits

---

## Security Best Practices
- Always use HTTPS in production
- Do not expose credentials in client code
- Rotate API keys regularly
- Validate all input on server

---

## Performance & Limits
- No explicit pagination in current endpoints
- API may enforce rate limits (not documented)

---

## Logging & Monitoring
- API logs errors and requests (see console logs in axios interceptors)

---

## Deployment & Environment Configuration
- All API URLs and credentials should be stored in environment variables
- Example:
```
REACT_APP_API_BASE_URL=http://124.40.244.211/netmon/cabletvapis
REACT_APP_API_AUTH=Basic Zm9maWxhYkBnbWFpbC5jb206MTIzNDUtNTQzMjE=
REACT_APP_API_DEVSLNO=FOFI20191129000336
```

---

## API Testing Guide

### Postman
- Set method, URL, headers, and body as above
- Inspect response for status and data

### cURL Testing
See cURL examples above for each endpoint

### Sample Test Cases
- Valid login returns OTP
- Invalid mobile returns error
- Valid OTP returns authentication success
- Invalid OTP returns error
- Channel/ads endpoints require valid mobile/userid

---

## FAQs & Troubleshooting

**Q:** Why do I get `err_code: 1`?
**A:** Check your request body and headers. Ensure mobile is valid and all headers are present.

**Q:** How do I get a valid Authorization header?
**A:** Contact your system administrator for credentials.

**Q:** Why do I get no channels or ads?
**A:** Ensure you are logged in and your mobile is registered.

---
