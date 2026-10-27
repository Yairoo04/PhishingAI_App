import os
import lxml.etree
from xml.dom import minidom
import re
import logging

try:
    from androguard.misc import AnalyzeAPK
except ImportError:
    logging.error("androguard not installed")

logger = logging.getLogger(__name__)

class AndroidFeatureExtractor:
    def __init__(self):
        self.original_features = [
            "transact", "onServiceConnected", "bindService", "attachInterface", 
            "ServiceConnection", "android.os.Binder", "SEND_SMS", 
            "Ljava.lang.Class.getCanonicalName", "Ljava.lang.Class.getMethods", 
            "Ljava.lang.Class.cast", "Ljava.net.URLDecoder", "android.content.pm.Signature",
            "android.telephony.SmsManager", "READ_PHONE_STATE", "getBinder", "ClassLoader",
            "Landroid.content.Context.registerReceiver", "Ljava.lang.Class.getField",
            "Landroid.content.Context.unregisterReceiver", "GET_ACCOUNTS", "RECEIVE_SMS",
            "Ljava.lang.Class.getDeclaredField", "READ_SMS", "getCallingUid",
            "Ljavax.crypto.spec.SecretKeySpec", "android.intent.action.BOOT_COMPLETED",
            "USE_CREDENTIALS", "MANAGE_ACCOUNTS", "android.content.pm.PackageInfo",
            "KeySpec", "TelephonyManager.getLine1Number", "DexClassLoader", "HttpGet.init",
            "SecretKey", "Ljava.lang.Class.getMethod", "System.loadLibrary",
            "android.intent.action.SEND", "Ljavax.crypto.Cipher", "WRITE_SMS",
            "READ_SYNC_SETTINGS", "AUTHENTICATE_ACCOUNTS", "android.telephony.gsm.SmsManager",
            "WRITE_HISTORY_BOOKMARKS", "TelephonyManager.getSubscriberId", "mount",
            "INSTALL_PACKAGES", "Runtime.getRuntime", "CAMERA", "Ljava.lang.Object.getClass",
            "WRITE_SYNC_SETTINGS", "READ_HISTORY_BOOKMARKS", "Ljava.lang.Class.forName",
            "INTERNET", "android.intent.action.PACKAGE_REPLACED", "Binder",
            "android.intent.action.SEND_MULTIPLE", "RECORD_AUDIO", "IBinder",
            "android.os.IBinder", "createSubprocess", "NFC", "ACCESS_LOCATION_EXTRA_COMMANDS",
            "URLClassLoader", "WRITE_APN_SETTINGS", "abortBroadcast", "BIND_REMOTEVIEWS",
            "android.intent.action.TIME_SET", "READ_PROFILE", "TelephonyManager.getDeviceId",
            "MODIFY_AUDIO_SETTINGS", "getCallingPid", "READ_SYNC_STATS", "BROADCAST_STICKY",
            "android.intent.action.PACKAGE_REMOVED", "android.intent.action.TIMEZONE_CHANGED",
            "WAKE_LOCK", "RECEIVE_BOOT_COMPLETED", "RESTART_PACKAGES",
            "Ljava.lang.Class.getPackage", "chmod", "Ljava.lang.Class.getDeclaredClasses",
            "android.intent.action.ACTION_POWER_DISCONNECTED", "android.intent.action.PACKAGE_ADDED",
            "PathClassLoader", "TelephonyManager.getSimSerialNumber", "Runtime.load",
            "TelephonyManager.getCallState", "BLUETOOTH", "READ_CALENDAR", "READ_CALL_LOG",
            "SUBSCRIBED_FEEDS_WRITE", "READ_EXTERNAL_STORAGE", "TelephonyManager.getSimCountryIso",
            "sendMultipartTextMessage", "PackageInstaller", "VIBRATE", "remount",
            "android.intent.action.ACTION_SHUTDOWN", "sendDataMessage", "ACCESS_NETWORK_STATE",
            "chown", "HttpPost.init", "Ljava.lang.Class.getClasses", "SUBSCRIBED_FEEDS_READ",
            "TelephonyManager.isNetworkRoaming", "CHANGE_WIFI_MULTICAST_STATE", "WRITE_CALENDAR",
            "android.intent.action.PACKAGE_DATA_CLEARED", "MASTER_CLEAR", "HttpUriRequest",
            "UPDATE_DEVICE_STATS", "WRITE_CALL_LOG", "DELETE_PACKAGES", "GET_TASKS",
            "GLOBAL_SEARCH", "DELETE_CACHE_FILES", "WRITE_USER_DICTIONARY",
            "android.intent.action.PACKAGE_CHANGED", "android.intent.action.NEW_OUTGOING_CALL",
            "REORDER_TASKS", "WRITE_PROFILE", "SET_WALLPAPER", "BIND_INPUT_METHOD",
            "divideMessage", "READ_SOCIAL_STREAM", "READ_USER_DICTIONARY", "PROCESS_OUTGOING_CALLS",
            "CALL_PRIVILEGED", "Runtime.exec", "BIND_WALLPAPER", "RECEIVE_WAP_PUSH",
            "DUMP", "BATTERY_STATS", "ACCESS_COARSE_LOCATION", "SET_TIME",
            "android.intent.action.SENDTO", "WRITE_SOCIAL_STREAM", "WRITE_SETTINGS",
            "REBOOT", "BLUETOOTH_ADMIN", "TelephonyManager.getNetworkOperator", "/system/bin",
            "MessengerService", "BIND_DEVICE_ADMIN", "WRITE_GSERVICES", "IRemoteService",
            "KILL_BACKGROUND_PROCESSES", "SET_ALARM", "ACCOUNT_MANAGER", "/system/app",
            "android.intent.action.CALL", "STATUS_BAR", "TelephonyManager.getSimOperator",
            "PERSISTENT_ACTIVITY", "CHANGE_NETWORK_STATE", "onBind", "Process.start",
            "android.intent.action.SCREEN_ON", "Context.bindService", "RECEIVE_MMS",
            "SET_TIME_ZONE", "android.intent.action.BATTERY_OKAY", "CONTROL_LOCATION_UPDATES",
            "BROADCAST_WAP_PUSH", "BIND_ACCESSIBILITY_SERVICE", "ADD_VOICEMAIL", "CALL_PHONE",
            "ProcessBuilder", "BIND_APPWIDGET", "FLASHLIGHT", "READ_LOGS",
            "Ljava.lang.Class.getResource", "defineClass", "SET_PROCESS_LIMIT",
            "android.intent.action.PACKAGE_RESTARTED", "MOUNT_UNMOUNT_FILESYSTEMS",
            "BIND_TEXT_SERVICE", "INSTALL_LOCATION_PROVIDER", "android.intent.action.CALL_BUTTON",
            "android.intent.action.SCREEN_OFF", "findClass", "SYSTEM_ALERT_WINDOW",
            "MOUNT_FORMAT_FILESYSTEMS", "CHANGE_CONFIGURATION", "CLEAR_APP_USER_DATA",
            "intent.action.RUN", "android.intent.action.SET_WALLPAPER", "CHANGE_WIFI_STATE",
            "READ_FRAME_BUFFER", "ACCESS_SURFACE_FLINGER", "Runtime.loadLibrary",
            "BROADCAST_SMS", "EXPAND_STATUS_BAR", "INTERNAL_SYSTEM_WINDOW",
            "android.intent.action.BATTERY_LOW", "SET_ACTIVITY_WATCHER", "WRITE_CONTACTS",
            "android.intent.action.ACTION_POWER_CONNECTED", "BIND_VPN_SERVICE",
            "DISABLE_KEYGUARD", "ACCESS_MOCK_LOCATION", "GET_PACKAGE_SIZE",
            "MODIFY_PHONE_STATE", "CHANGE_COMPONENT_ENABLED_STATE", "CLEAR_APP_CACHE",
            "SET_ORIENTATION", "READ_CONTACTS", "DEVICE_POWER", "HARDWARE_TEST",
            "ACCESS_WIFI_STATE", "WRITE_EXTERNAL_STORAGE", "ACCESS_FINE_LOCATION",
            "SET_WALLPAPER_HINTS", "SET_PREFERRED_APPLICATIONS", "WRITE_SECURE_SETTINGS"
        ]

        self.pscout_simple = {
            'android.telephony.telephonymanagergetdeviceid': 'android.permission.READ_PHONE_STATE',
            'android.telephony.telephonymanagergetsubscriberid': 'android.permission.READ_PHONE_STATE',
            'android.telephony.telephonymanagergetline1number': 'android.permission.READ_PHONE_STATE',
            'android.telephony.smsmanagersendtextmessage': 'android.permission.SEND_SMS',
            'android.location.locationmanagergetlastknownlocation': 'android.permission.ACCESS_FINE_LOCATION'
        }

        self.android_suspicious_apis = [
            "getExternalStorageDirectory", "getSimCountryIso", "execHttpRequest",
            "sendTextMessage", "getSubscriberId", "getDeviceId", "getPackageInfo",
            "getSystemService", "getWifiState", "setWifiEnabled", "setWifiDisabled", "Cipher"
        ]

        self.other_suspicious_apis = [
            "Ljava/net/HttpURLconnection;->setRequestMethod(Ljava/lang/String;)", 
            "Ljava/net/HttpURLconnection", "Lorg/apache/http/client/methods/HttpPost", 
            "Landroid/telephony/SmsMessage;->getMessageBody", 
            "Ljava/io/IOException;->printStackTrace", "Ljava/lang/Runtime;->exec"
        ]

        self.not_like_apis = ["system/bin/su", "android/os/Exec"]

    def extract_features(self, apk_path):
        data_dictionary = self._process_apk(apk_path)
        if not data_dictionary:
            return None
        
        feature_vector = {feature: 0 for feature in self.original_features}
        
        for perm in data_dictionary.get("RequestedPermissionList", []):
            perm_short = perm.replace("android.permission.", "")
            if perm_short in self.original_features:
                feature_vector[perm_short] = 1
        
        for intent in data_dictionary.get("IntentFilterList", []):
            if intent in self.original_features:
                feature_vector[intent] = 1
        
        for api in data_dictionary.get("RestrictedApiList", []):
            if api in self.original_features:
                feature_vector[api] = 1
        
        for api in data_dictionary.get("SuspiciousApiList", []):
            if api in self.original_features:
                feature_vector[api] = 1
        
        for url in data_dictionary.get("URLDomainList", []):
            if url in self.original_features:
                feature_vector[url] = 1
        
        suspicious_list = str(data_dictionary.get("SuspiciousApiList", []))
        if "/system/bin" in suspicious_list:
            feature_vector["/system/bin"] = 1
        if "/system/app" in suspicious_list:
            feature_vector["/system/app"] = 1

        return feature_vector

    def _process_apk(self, apk_path):
        try:
            a, d, dx = AnalyzeAPK(apk_path)
            
            requested_permission_set, activity_set, service_set, content_provider_set,                broadcast_receiver_set, hardware_components_set, intent_filter_set = self._get_from_xml(apk_path, a)
            
            data_dictionary = {}
            data_dictionary["RequestedPermissionList"] = list(requested_permission_set)
            data_dictionary["IntentFilterList"] = list(intent_filter_set)

            used_permissions, restricted_api_set, suspicious_api_set, url_domain_set =                self._get_from_instructions(a, d, dx, list(requested_permission_set))
            
            data_dictionary["UsedPermissionsList"] = list(used_permissions)
            data_dictionary["RestrictedApiList"] = list(restricted_api_set)
            data_dictionary["SuspiciousApiList"] = list(suspicious_api_set)
            data_dictionary["URLDomainList"] = list(url_domain_set)

            return data_dictionary
        except Exception as e:
            logger.error(f"Error processing APK {apk_path}: {e}")
            return None

    def _get_from_xml(self, apk_file, a):
        requested_permission_set = set()
        activity_set = set()
        service_set = set()
        content_provider_set = set()
        broadcast_receiver_set = set()
        hardware_components_set = set()
        intent_filter_set = set()

        try:
            xml_path = apk_file + ".xml"
            with open(xml_path, "w") as f:
                f.write(lxml.etree.tostring(a.xml['AndroidManifest.xml'], pretty_print=True).decode())

            with open(xml_path, "r") as f:
                dom = minidom.parse(f)
                collection = dom.documentElement

                for perm in collection.getElementsByTagName("uses-permission"):
                    name = perm.getAttribute("android:name")
                    if name: requested_permission_set.add(name)

                for activity in collection.getElementsByTagName("activity"):
                    name = activity.getAttribute("android:name")
                    if name: activity_set.add(name)

                for service in collection.getElementsByTagName("service"):
                    name = service.getAttribute("android:name")
                    if name: service_set.add(name)

                for provider in collection.getElementsByTagName("provider"):
                    name = provider.getAttribute("android:name")
                    if name: content_provider_set.add(name)

                for receiver in collection.getElementsByTagName("receiver"):
                    name = receiver.getAttribute("android:name")
                    if name: broadcast_receiver_set.add(name)

                for hw in collection.getElementsByTagName("uses-feature"):
                    name = hw.getAttribute("android:name")
                    if name: hardware_components_set.add(name)

                for intent in collection.getElementsByTagName("intent-filter"):
                    for action in intent.getElementsByTagName("action"):
                        name = action.getAttribute("android:name")
                        if name: intent_filter_set.add(name)

            if os.path.exists(xml_path):
                os.remove(xml_path)
        except Exception as e:
            logger.error(f"XML parse error: {e}")

        return (requested_permission_set, activity_set, service_set, content_provider_set,
                broadcast_receiver_set, hardware_components_set, intent_filter_set)

    def _get_from_instructions(self, a, d, dx, requested_permission_list):
        used_permissions = set()
        restricted_api_set = set()
        suspicious_api_set = set()
        url_domain_set = set()

        for _dex in d:
            for method in _dex.get_methods():
                g = dx.get_method(method)
                if g is None:
                    continue
                
                for basic_block in g.get_basic_blocks().get():
                    instructions = []
                    for inst in basic_block.get_instructions():
                        instructions.append(f"{inst.get_name()} {inst.get_output()}")

                    apis, suspicious_apis = self._parse_apis(instructions)
                    
                    for api in apis:
                        api_class = api['ApiClass'].replace("/", ".").replace("Landroid", "android").strip()
                        lookup_key = api_class.lower() + api['ApiName'].lower()
                        permission = self.pscout_simple.get(lookup_key)

                        if permission is not None:
                            if permission in requested_permission_list:
                                used_permissions.add(permission)
                            else:
                                restricted_api_set.add(api_class + "." + api["ApiName"])

                    suspicious_api_set.update(suspicious_apis)

                    for inst in instructions:
                        url_search = re.search(r"https?://([\da-z\.-]+\.[a-z\.]{2,6}|[\d.]+)[^'\"]*", inst, re.IGNORECASE)
                        if url_search:
                            url = url_search.group()
                            m = re.search(r"https?://([^/:\\\\]*)", url, re.IGNORECASE)
                            if m:
                                domain = m.group(1)
                                url_domain_set.add(domain)

        return used_permissions, restricted_api_set, suspicious_api_set, url_domain_set

    def _parse_apis(self, instructions):
        api_list = []
        suspicious_api_set = set()
        
        for code in instructions:
            if "invoke-" in code:
                parts = code.split(",")
                for part in parts:
                    if ";->" in part:
                        part = part.strip()
                        if part.startswith('Landroid'):
                            api_parts = part.split(";->")
                            api_class = api_parts[0].strip()
                            api_name = api_parts[1].split("(")[0].strip()
                            
                            api_list.append({
                                'FullApi': part,
                                'ApiClass': api_class,
                                'ApiName': api_name
                            })
                            
                            if api_name in self.android_suspicious_apis:
                                suspicious_api_set.add(api_class + "." + api_name)
                    
                    for el in self.other_suspicious_apis:
                        if el in part:
                            suspicious_api_set.add(el)
            
            for el in self.not_like_apis:
                if el in code:
                    suspicious_api_set.add(el)
                    
        return api_list, suspicious_api_set
