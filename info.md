Device Unique ID
Service URI - luna://com.webos.service.sm

Provides app security and authentications services such as app signature verification. From webOS 3.0 or later platform device, you can use this security manager service for device identification/authentication API.

Methods

Method	Description	Supported in Emulator
deviceid/getIDs	Returns device IDs that are provided by webOS TV	No
deviceid/getIDs
Description

This API returns the device ID provided by the webOS TV. Currently,LGUDID (LG Unique Device ID) is supported.

LGUDID is generated using MAC as a seed, but it also uses the randomly generated UUID (Universally Unique ID). LGUDID is generated according to the UUID version 5 spec and uses MAC as a name and randomly generated UUID (version 4) instead of a namespace ID.

Important: Privacy Policy
Before you are using this API, you must get an agreement from the user for using their personal information.
Parameters

Name	Required	Type	Description
idType	Required	String array	Array of id types. Currently, "LGUDID" is allowed.
Example: ["LGUDID"]
Call returns

Name	Required	Type	Description
idList	Required	Object Array	Array of device ID data (idType and idValue)
Error Code Reference

Error Code	Error Code Text	Error Code Description
ERR.001	Invalid Parameters	Invalid parameter
ERR.002	Security Manager Internal Error	Security manager internal error
ERR.801	Unsupported Device ID Type	Unsupported device ID type is given for deviceId/getIDs API
Example

// Get system ID information
var request = webOS.service.request('luna://com.webos.service.sm', {
  method: 'deviceid/getIDs',
  parameters: {
    idType: ['LGUDID'],
  },
  onSuccess: function (inResponse) {
    console.log('Result: ' + JSON.stringify(inResponse));
    // To-Do something
  },
  onFailure: function (inError) {
    console.log('Failed to get system ID information');
    console.log('[' + inError.errorCode + ']: ' + inError.errorText);
    // To-Do something
    return;
  },
});
Return example

// Success return
{
  "idList": [
      {
          "idValue": "095f142a-xxxx-ac5d-xxxx-92c8be18xxxx",
          "idType": "LGUDID"
      }
  ],
  "returnValue": true
}

// Failure return
{
  "returnValue" : false
  "errorCode": "ERR.001",
  "errorText": "Invalid Parameters"
}
See also

TV Device Information
Object
idList object
The object that consists of idType and idValue.

{
  "idType": string,
  "idValue": string
}
Name	Required	Type	Description
idType	Required	string	Device ID Type
idValue	Required	string	Device ID Value


