"use strict"

// store chameleon settings
let chameleon = {
	headers: {
		blockEtag: false,
		disableAuth: false,
		disableRef: false,
		enableDNT: false,
		refererXorigin: 0,
		refererTrimming: 0,
		spoofAcceptEnc: false,
		spoofAcceptLang: false,
		spoofAcceptLangValue: "",
		spoofSourceRef: false,
		spoofVia: false,
		spoofViaValue: 0,
		spoofXFor: false,
		spoofXForValue: 0,
		upgradeInsecureRequests: false,
		viaIP: "",
		viaIP_profile: "",
		xforwardedforIP: "",
		xforwardedforIP_profile: "",
		useragent: ""
	},
	excluded: {
		win: [false,false,false,false,false,false,false,false,false,false,false,false,false,false,false],
		mac: [false,false,false,false,false,false,false,false],
		linux: [false,false,false,false,false,false,false,false,false,false,false],
		ios: [false,false,false,false,false,false,false,false,false],
		android: [false,false,false,false,false,false,false,false],
		all: [false, false, false, false, false]
	},
	injection: null,
	ipInfo: {
		update: 0,
		language: "",
		timezone: ""
	},
	settings: {
		customScreen: "",
		disableWebSockets: false,
		enableScriptInjection: false,
		interval: 0,
		limitHistory: false,
		minInterval: null,
		maxInterval: null,
		notificationsEnabled: false,
		protectWinName: false,
		screenSize: "default",
		spoofAudioContext: false,
		spoofClientRects: false,
		timeZone: "default",
		useragent: "real",
		useragentValue: ""
	},
	timeout: null,
	whitelist: {
		enabled: false,
		enableRealProfile: false,
		profile: {
			acceptEnc: "",
			acceptLang: "",
			appCodeName: "",
			appName: "",
			appVersion: "",
			hardwareConcurrency: 4,
			osCPU: "",
			platform: "",
			productSub: "",
			useragent: "",
			vendor: "",
			vendorSub: ""
		},
		urlList: []
	}
}

// spoof contains functions that return js to inject
// also contains the profileResolution to persist profile resolution
let spoof = {
	dnt: function (injectionArray) {
		injectionArray.push({ obj: "window.navigator", prop: "doNotTrack", value: true });
		return injectionArray;
	},
	history: function (injectionArray) {
		injectionArray.push({ obj: "window.history", prop: "length", value: 2 });
		return injectionArray;
	},
	language: function (injectionArray) {
		let l;

		l = chameleon.headers.spoofAcceptLangValue == "ip" ?
				languages.find(l => l.value == chameleon.ipInfo.language) :
				languages.find(l => l.value == chameleon.headers.spoofAcceptLangValue);

		injectionArray.push({ obj: "window.navigator", prop: "language", value: l.lang });
		injectionArray.push({ obj: "window.navigator", prop: "languages", value: l.langs });
		return injectionArray;
	},
	name: function (injectionArray) {
		injectionArray.push({ obj: "window", prop: "name", value: "" });
		return injectionArray;
	},
	navigator: function () {
		var appVersion, hardwareConcurrency, oscpu, platform, productSub, vendor;

		if (chameleon.headers.useragent == "") return [];

		if (/Win/.test(chameleon.headers.useragent)) {
			oscpu = chameleon.headers.useragent.match(/(Windows .*?);/)[1];
			platform = "Win64";
			hardwareConcurrency = 4;
			vendor = "";
			appVersion = /Firefox/.test(chameleon.headers.useragent) ? "5.0 (Windows)" : chameleon.headers.useragent.match(/Mozilla\/(.*)/)[1];
		} else if (/OS X 10(_|\.)/.test(chameleon.headers.useragent)) {
			oscpu = chameleon.headers.useragent.match(/(Intel Mac OS X 10(_|\.)\d+)/)[0].replace("_",".");
			platform = "MacIntel";
			hardwareConcurrency = 4;
			vendor = "Apple Computer, Inc";
			appVersion = /Firefox/.test(chameleon.headers.useragent) ? "5.0 (Macintosh)" : chameleon.headers.useragent.match(/Mozilla\/(.*)/)[1];
		} else if (/X11/.test(chameleon.headers.useragent)) {
			platform = oscpu = "Linux x86_64";
			hardwareConcurrency = 4;
			appVersion = /Firefox/.test(chameleon.headers.useragent) ? "5.0 (X11)" : chameleon.headers.useragent.match(/Mozilla\/(.*)/)[1];
		} else if (/iPhone/.test(chameleon.headers.useragent)) {
			platform = "iPhone";
			vendor = "Apple Computer, Inc";
			hardwareConcurrency = 2;
		} else if (/iPad/.test(chameleon.headers.useragent)) {
			platform = "iPad";
			vendor = "Apple Computer, Inc";
			hardwareConcurrency = 2;
		} else if (/Android/.test(chameleon.headers.useragent)) {
			platform = "Linux armv7l";
			vendor = "Google Inc";
			hardwareConcurrency = 1;
			appVersion = /Firefox/.test(chameleon.headers.useragent) ? "5.0 (Android)" : chameleon.headers.useragent.match(/Mozilla\/(.*)/)[1];
		} else {
			return [
				{ obj: "window.navigator", prop: "userAgent", value: chameleon.headers.useragent }
			];
		}

		if (/Firefox/.test(chameleon.headers.useragent)) {
			productSub = "20010725";
		} else if (/Chrome|Safari/.test(chameleon.headers.useragent)) {
			productSub = "20030107";
		} else if (/IE/.test(chameleon.headers.useragent)) {
			productSub = null;
		} else {
			productSub = "";
		}

		return [
			{ obj: "window.navigator", prop: "userAgent", value: chameleon.headers.useragent },
			{ obj: "window.navigator", prop: "platform", value: platform },
			{ obj: "window.navigator", prop: "productSub", value: productSub },
			{ obj: "window.navigator", prop: "hardwareConcurrency", value: hardwareConcurrency },
			{ obj: "window.navigator", prop: "oscpu", value: oscpu },
			{ obj: "window.navigator", prop: "vendor", value: vendor },
			{ obj: "window.navigator", prop: "vendorSub", value: "" },
			{ obj: "window.navigator", prop: "appVersion", value: appVersion },
			{ obj: "window.navigator", prop: "buildID", value: "" }
		];
	},
	profileResolution: "",
	screen: function(screenSize, injectionArray) {
		var s;
		var depth = 24;

		if (screenSize == "profile") {
			if (chameleon.settings.useragent == "" || chameleon.settings.useragent == "real") {
				return injectionArray;
			} else if (spoof.profileResolution != "") {
				s = spoof.profileResolution.split("x");
			} else {
				s = getScreenResolution(chameleon.headers.useragent);
				depth = s[2];
			}
		} else if (screenSize == "custom") {
			s = chameleon.settings.customScreen.split("x");
		} else {
			s = screenSize.split("x");
		}

		let width = parseInt(s[0]);
		let height = parseInt(s[1]);

		// use real profile screen resolution if couldn't determine from useragent
		if (width == null) return injectionArray;

		injectionArray.push(...[
				{ obj: "window.screen", prop: "width", value: width },
				{ obj: "window.screen", prop: "height", value: height },
				{ obj: "window", prop: "innerWidth", value: width },
				{ obj: "window", prop: "innerHeight", value: height },
				{ obj: "window.screen", prop: "outerWidth", value: width },
				{ obj: "window.screen", prop: "outerHeight", value: height },
				{ obj: "window.screen", prop: "innerWidth", value: width },
				{ obj: "window.screen", prop: "innerHeight", value: height },
				{ obj: "window.screen", prop: "availWidth", value: width },
				{ obj: "window.screen", prop: "availHeight", value: height },
				{ obj: "window.screen", prop: "top", value: 0 },
				{ obj: "window.screen", prop: "left", value: 0 },
				{ obj: "window.screen", prop: "availTop", value: 0 },
				{ obj: "window.screen", prop: "availLeft", value: 0 },
				{ obj: "window.screen", prop: "colorDepth", value: depth },
				{ obj: "window.screen", prop: "pixelDepth", value: depth },
				{ obj: "window.document.documentElement", prop: "clientWidth", value: width },
				{ obj: "window.document.documentElement", prop: "clientHeight", value: height },
			]);
		return injectionArray;
	},
	websocket: function (injectionArray) {
		injectionArray.push({obj: "window", prop: "WebSocket", value: null});
		injectionArray.push({obj: "window", prop: "MozWebSocket", value: null});

		return injectionArray;
	}
};

let customIntervalTimer = null;
let tooltipData = {};

// builds script to inject into pages
async function buildInjectScript() {
	let injectionArray = [];
	let injectionText = "";
	let nav = [];

	if (chameleon.settings.enableScriptInjection) {
		injectionArray = spoof.websocket(injectionArray);
		injectionArray = spoof.name(injectionArray);
		if (chameleon.settings.limitHistory) injectionArray = spoof.history(injectionArray);
		if (chameleon.settings.spoofAudioContext) injectionText += spoofAudioContext(`_${Math.random().toString(36)}`);
		if (chameleon.settings.spoofClientRects) injectionText += spoofRects(`_${Math.random().toString(36)}`);

		nav = spoof.navigator();

		if (chameleon.settings.screenSize != "default") {
			injectionArray = spoof.screen(chameleon.settings.screenSize, injectionArray);
		}

		if (chameleon.headers.enableDNT) {
			injectionArray = spoof.dnt(injectionArray);
		}

		if (chameleon.headers.spoofAcceptLang) {
			injectionArray = spoof.language(injectionArray);
		}

		if (chameleon.settings.timeZone != "default") {
			var t = moment.tz(Date.now(), chameleon.settings.timeZone == "ip" ? chameleon.ipInfo.timezone : chameleon.settings.timeZone);

			injectionText += spoofTime(
				t.utcOffset(),
				t.format("z"),
				chameleon.settings.timeZone == "ip" ? chameleon.ipInfo.timezone : chameleon.settings.timeZone,
				`_${Math.random().toString(36)}`
			);
		}

		return inject(
			injectionArray,
			chameleon.whitelist,
			nav,
			injectionText,
			{
				websocket : chameleon.settings.disableWebSockets,
				screen : chameleon.settings.screenSize != "default",
				name : chameleon.settings.protectWinName
			},
			languages
		);
	}

	return "";
}

// get ip info from ipapi.co
async function getIPInfo() {
	try {
		let res = await request("https://ipapi.co/json");
		let data = await JSON.parse(res);
		let tzSpoof = "";
		let langSpoof = "";

		if (data.timezone && data.languages) {
			if (chameleon.settings.timeZone == "ip") {
				tzSpoof = ` timezone: UTC${moment().tz(data.timezone).format('Z')}`;
				chameleon.ipInfo.timezone = data.timezone;
			}

			if (chameleon.headers.spoofAcceptLangValue == "ip") {
				let responseLanguage = data.languages.split(',')[0];
				let lang = languages.find(l => l.display == "English (US)"); // default value

				if (responseLanguage != "en" && responseLanguage != "en-US") {
					let index = langList.map(l => l[0]).findIndex(l => l.includes(responseLanguage));

					if (index > -1) {
						lang = languages[index];
					} else {
						// check the list again, not restricted to primary language
						let idxs = [];
						for (var i = 0; i < langList.length; i++) {
							let idx = langList[i].findIndex(l => l.includes(responseLanguage) || (l.includes(responseLanguage.split('-')[0]) && responseLanguage.split('-')[0] != "en"));
							if (idx > -1) {
								idxs.push([
									idx > -1,
									i,
									idx
								])
							}
						}
						if (idxs.length) {
							idxs.sort((a,b) => a[2] > b[2]);
							lang = languages[idxs[0][1]];
						}
					}
				}

				langSpoof = ` lang: ${lang.display}`;
				chameleon.ipInfo.language = lang.value;
			}

			if (chameleon.settings.notificationsEnabled) {
				chrome.notifications.create({
					"type": "basic",
					"title": "Chameleon",
					"message": `Using${tzSpoof}${langSpoof}`
				});
			}
			
			return;
		}


		throw "Couldn't find info";
	} catch (e) {
		if (chameleon.settings.notificationsEnabled) {
			chrome.notifications.create({
				"type": "basic",
				"title": "Chameleon",
				"message": "Unable to get timezone data. Using UTC."
			});
		}

		chameleon.ipInfo.timezone = "Etc/UTC";
	}
}

// activates timer for new profile
function changeTimer() {
	chrome.alarms.clear("profile");
	
	let task = {when: Date.now() + 250};

	if (chameleon.settings.interval) {
		if (chameleon.settings.interval == "-1") {
			if (!chameleon.settings.minInterval || !chameleon.settings.maxInterval) return;

			var interval = ((Math.random() *
							(chameleon.settings.maxInterval * 60 * 1000 - chameleon.settings.minInterval  * 60 * 1000)) +
							chameleon.settings.minInterval  * 60 * 1000);

			if (customIntervalTimer) clearTimeout(customIntervalTimer);
			customIntervalTimer = setTimeout(changeTimer, interval);
		} else {
			task["periodInMinutes"] = chameleon.settings.interval;
		}
	}
	
	chrome.alarms.create("profile", task);
}

// generates a number for ip address
function generateByte() {
	var num = Math.floor(Math.random() * (256));
	return (num === 10 || num === 172 || num === 192) ? generateByte() : num;
}

// wrappers for storage API to use with async function
function get(key) {
	return new Promise((resolve) => {
		chrome.storage.local.get(key, (item) => {
			typeof key == "string" ? resolve(item[key]) : resolve(item);
		});
	});
}

// extract data from useragent data for tooltip
function getTooltipInfo(u) {
	var os, browser, tmp;

	if (u.name.includes('(')) {
		tmp = u.name.match(/^(.*?)\s\((.*?)\)/);
		os = tmp[2];
		browser = tmp[1];
	} else if (u.name.includes('iOS')) {
		tmp = u.name.match(/(iOS.*?\s-\s\w+)\s-\s(.*?)$/);
		os = tmp[1];
		browser = tmp[2];
	} else {
		tmp = u.name.match(/(Android(\s.+)?)\s-\s(.*?)$/);
		os = tmp[1];
		browser = tmp[3];
	}

	return {
		os,
		browser
	}
}

// fitler excluded profiles
function filterProfiles(uaList) {
	let uas = [];

	for (var i in uaList) {
		let key = uaList[i].value.match(/([a-z]+)(\d+)/);
		let index = parseInt(key[2]);
		if (!chameleon.excluded[key[1]][index - 1]) {
			uas.push(uaList[i]);
		}
	}

	return uas.length ? uas : [];
}

// make XMLHttpRequest
function request(url) {
  return new Promise(function(resolve, reject) {
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function(e) {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          resolve(xhr.response)
        } else {
          reject(xhr.status)
        }
      }
    }
    xhr.ontimeout = function () {
      reject('timeout')
    }
    xhr.open('get', url, true)
    xhr.send()
  })
}

// rewrite headers per request 
function rewriteHeaders(e) {
	var wl = whitelisted(e.url);

	e.requestHeaders.forEach(function(header){
		if (header.name.toLowerCase() == "authorization") {
			if (!wl.on) {
				if (chameleon.headers.disableAuth) header.value = "";
			} else if (wl.opt.auth) {
				header.value = "";
			}
		} else if (header.name.toLowerCase() == "referer") {
			if (!wl.on) {
				if (chameleon.headers.disableRef) {
					header.value = "";
				} else if (chameleon.headers.spoofSourceRef) {
					header.value = e.url;
				} else {
					// check referer policies
					if (chameleon.headers.refererXorigin >= 1) {
						var url = new URL(e.url);
						var ref = new URL(header.value);

						if (chameleon.headers.refererXorigin == 1) {
							if (url.hostname.split('.').splice(-2).join(".") != ref.hostname.split('.').splice(-2).join(".")) {
								header.value = "";
							}
						} else {
							if (url.origin != ref.origin) {
								header.value = "";
							}
						}
					}

					if (chameleon.headers.refererTrimming >= 1) {
						if (header.value != "") {
							var url = new URL(header.value);
							header.value = (chameleon.headers.refererTrimming == 1) ? (url.origin + url.pathname) : url.origin;
						}
					}
				}
			} else if (wl.opt.ref) {
				header.value = "";
			}
		} else if (header.name.toLowerCase() == "user-agent") {
			if (wl.on) {
				if (!chameleon.whitelist.enableRealProfile) {
					header.value = chameleon.whitelist.profile.useragent;
				}
			} else {
				if (chameleon.headers.useragent) header.value = chameleon.headers.useragent;
			}
		} else if (header.name.toLowerCase() == "accept-encoding") {
			if (wl.on) {
				if (!chameleon.whitelist.enableRealProfile) header.value = chameleon.whitelist.profile.acceptEnc;
			} else {
				if (chameleon.headers.spoofAcceptEnc) header.value = "gzip, deflate";
			}
		} else if (header.name.toLowerCase() === "accept-language") {
			if (wl.on) {
				if (wl.lang != "") {
					header.value = wl.lang;
				} else if (!chameleon.whitelist.enableRealProfile) {
					header.value = chameleon.whitelist.profile.acceptLang;
				}
			} else {
				if (chameleon.headers.spoofAcceptLang) {
					if (chameleon.headers.spoofAcceptLangValue == "ip") {
						header.value = chameleon.ipInfo.language; 
					} else {
						header.value = chameleon.headers.spoofAcceptLangValue;
					}
				}
			}
		}
	});

	let dntIndex = e.requestHeaders.findIndex(h => h.name.toLowerCase() == "dnt");
	if (chameleon.headers.enableDNT) {
		if (dntIndex == -1) e.requestHeaders.push({ name: "DNT", value: "1"});
	} else {
		if (dntIndex >= 0) e.requestHeaders.splice(dntIndex, 1);
	}

	if (chameleon.headers.upgradeInsecureRequests) {
		e.requestHeaders.push({ name: "Upgrade-Insecure-Requests", value: "1"});
	}

	if (!wl.on || wl.opt.ip) {
		if (chameleon.headers.spoofVia) {
			if (chameleon.headers.spoofViaValue == 1) {
				e.requestHeaders.push({ name: "Via", value: "1.1 " + chameleon.headers.viaIP });
			} else {
				e.requestHeaders.push({ name: "Via", value: "1.1 " + chameleon.headers.viaIP_profile });
			}
		}

		if (chameleon.headers.spoofXFor) {
			if (chameleon.headers.spoofXForValue == 1) {
				e.requestHeaders.push({ name: "X-Forwarded-For", value: chameleon.headers.xforwardedforIP })
			} else {
				e.requestHeaders.push({ name: "X-Forwarded-For", value: chameleon.headers.xforwardedforIP_profile });
			}
		}
	}

	return { requestHeaders: e.requestHeaders };
}

function rewriteResponseHeaders(e) {
	var wl = whitelisted(e.url);

	e.responseHeaders.forEach(function(header){
		if (header.name.toLowerCase() == "etag") {
			if (!wl.on) {
				if (chameleon.headers.blockEtag) header.value = "";
			}
		}
	});

	return { responseHeaders: e.responseHeaders };
}


// determines useragent and screen resolution when new task created
async function start() {
	var title, uas;

	// pick new useragent
	if (chameleon.settings.useragent == "" || chameleon.settings.useragent == "real"){
		// real profile
		title = "Profile Spoofing Disabled";
		chameleon.headers.useragent = "";
	} else if (/.*?\d+/.test(chameleon.settings.useragent)) {
		// check in case updated user agent
		var regexMatch = chameleon.settings.useragent.match(/(.*?)(\d+)/);
		var plat;

		if (regexMatch[1].includes("win")) {
			plat = "win";
		} else if (regexMatch[1].includes("mac")) {
			plat = "mac";
		} else {
			plat = regexMatch[1];
		}

		let u = uaList[plat].find(u => u.value == chameleon.settings.useragent);
		tooltipData = getTooltipInfo(u);

		chameleon.headers.useragent = u.ua;
	} else if (chameleon.settings.useragent == "custom") {
		tooltipData.os = "Custom";
		tooltipData.browser = "Custom";

		chameleon.headers.useragent = chameleon.settings.useragentValue;
	} else {
		if (/random_/.test(chameleon.settings.useragent)) {
			uas = filterProfiles(uaList[chameleon.settings.useragent.split('_')[1]]);
		} else if (chameleon.settings.useragent == "random") {
			// random useragent
			uas = filterProfiles(uaList.win.concat(
				uaList.mac,
				uaList.linux,
				uaList.ios,
				uaList.android
			));
		} else if (chameleon.settings.useragent == "randomDesktop") {
			// random desktop useragent
			uas = filterProfiles(uaList.win.concat(
				uaList.mac,
				uaList.linux
			));
		} else if (chameleon.settings.useragent == "randomMobile") {
			// random mobile useragent
			uas = filterProfiles(uaList.ios.concat(uaList.android));
		}

		if (uas.length > 0) {
			let u = uas[Math.floor(Math.random() * uas.length)];
			tooltipData = getTooltipInfo(u);
			chameleon.headers.useragent = u.ua;
		} else {
			chameleon.headers.useragent = "";
		}
	}

	chameleon.headers.viaIP_profile = chameleon.headers.xforwardedforIP_profile = `${generateByte()}.${generateByte()}.${generateByte()}.${generateByte()}`;

	if (chameleon.headers.useragent && chameleon.settings.notificationsEnabled) {
		chrome.notifications.create({
			"type": "basic",
			"title": "Chameleon",
			"message": "Browser Profile Changed\r\n" + chameleon.headers.useragent
		});
	}

	title = tooltipData.os ? `Chameleon | ${tooltipData.os} - ${tooltipData.browser}` : "Chameleon";
	let platformInfo = browser.runtime.getPlatformInfo();
	if (platformInfo.os != "android") chrome.browserAction.setTitle({ title });
	rebuildInjectionScript();
}

// gets screen resolution & depths from user agent
function getScreenResolution(ua) {
	var screens;
	var depth = 24; // both color and pixel depth

	if (/Win|X11/.test(ua)) {
		screens = [
			[1366, 768],
			[1400, 1050],
			[1440, 900],
			[1600, 900],
			[1920, 1080],
			[1920, 1200],
			[2560, 1440],
			[2560, 1600]
		];
	} else if (/OS X 10/.test(ua)) {
		screens = [
			[1920, 1080],
			[2560, 1440],
			[2560, 1600]
		];
	} else if (/iPhone/.test(ua)) {
		screens = [
			[414, 736],
			[375, 667]
		];
		depth = 32;
	} else if (/iPad/.test(ua)) {
		screens = [
			[1024, 768]
		];
		depth = 32;
	} else if (/Android/.test(ua)) {
		screens = [
			[360, 740],
			[411, 731],
			[480, 853]
		];
		depth = 32;
	} else {
		return [null, null, null];
	}

	var num = Math.floor(Math.random() * screens.length);

	return [screens[num][0], screens[num][1], depth];
}

// rebuilds injection script
// uses a small delay before building in case there are multiple function calls in a short period
async function rebuildInjectionScript() {
	clearTimeout(chameleon.timeout);

	if (chameleon.ipInfo.update) {
		chameleon.ipInfo.update = 0;
		await getIPInfo();
	}

	chameleon.timeout = setTimeout(async function () {
		if (chameleon.injection) {
			chameleon.injection.unregister();
			chameleon.injection = null;
		}

		chameleon.injection = await browser.contentScripts.register({
			matches: ["http://*/*", "https://*/*"],
			js: [{code: await buildInjectScript() }],
			runAt: "document_start"
		});
	}, 500);
}

function save(obj) {
	return new Promise((resolve) => {
		chrome.storage.local.set(obj, () => {
			resolve();
		});
	});
}

async function saveSettings(setting="all") {
	if (setting == "all") {
		await save({ headers: chameleon.headers,
			 whitelist: chameleon.whitelist,
			 excluded: chameleon.excluded,
			 settings: chameleon.settings
		});
		return;
	}

	var tmp = {};
	tmp[setting] = chameleon[setting];
	await save(tmp);

	rebuildInjectionScript();
}

// check if a url is whitelisted, prevents script injection
function whitelisted(url) {
	if (chameleon.whitelist.enabled) {
		var idx = chameleon.whitelist.urlList.findIndex(u => url.indexOf(u.url) > -1);
		if (idx > -1) {
			if (chameleon.whitelist.urlList[idx].re) {
				if (!new RegExp(chameleon.whitelist.urlList[idx].pattern, "i").test(url)) {
					return {on: false};
				};
			}

			return {on: true, opt: chameleon.whitelist.urlList[idx].options, lang: chameleon.whitelist.urlList[idx].lang};
		}
	}

	return {on: false};
}

// initialize settings
function init(data) {
	["headers", "excluded", "settings", "whitelist"].forEach(opt => {
		Object.keys(chameleon[opt]).forEach(key => {
			if (data[opt][key] != undefined) chameleon[opt][key] = data[opt][key];
		})
	});

	chameleon.headers.useragent = "";
	saveSettings();
}

/*
	Event Listeners
*/

chrome.runtime.onMessage.addListener(function(request) {
	if (request.action == "clear") {
		if (request.data == "resetTracking") {
			chrome.privacy.websites.trackingProtectionMode.clear({});
		} else if (request.data == "resetFirstParty") {
			chrome.privacy.websites.firstPartyIsolate.clear({});
		} else if (request.data == "resetFingerprinting") {
			chrome.privacy.websites.resistFingerprinting.clear({});
		}
	} if (request.action == "exclude") {
		let key = request.data.key.split('_')[1].match(/([a-z]+)(\d+)/);
		let index = parseInt(key[2]);
		chameleon.excluded[key[1]][index - 1] = request.data.value;

		changeTimer();
		saveSettings("excluded");
	} else if (request.action == "import") {
		chameleon.headers = request.data.headers;
		chameleon.settings = request.data.settings;
		chameleon.excluded = request.data.excluded;
		chameleon.whitelist = request.data.whitelist;

		browser.runtime.getPlatformInfo().then((plat) => {
			if (chameleon.settings.useragent == "real") {
				if (plat.os != "android") {
					chrome.browserAction.setIcon({
						path: "img/icon_disabled_48.png"
					});
				}
			} else {
				chrome.browserAction.setIcon({
					path: "img/icon_48.png"
				});
			}
		});

		if (chameleon.settings.timeZone == "ip" || (chameleon.headers.spoofAcceptLangValue == "ip" && chameleon.headers.spoofAcceptLang)) {
			chameleon.ipInfo.update = 1;
		}

		saveSettings();
		setTimeout(function () {
			browser.runtime.reload();
		}, 2000);
	} else if (request.action == "interval") {
		chameleon.settings.interval = request.data;

		if (request.data != "-1") {
			chameleon.settings.minInterval = chameleon.settings.maxInterval = null;
		}

		changeTimer();
		saveSettings("settings");
	} else if (request.action == "intervals") {
		chameleon.settings.minInterval = request.data[0];
		chameleon.settings.maxInterval = request.data[1];

		changeTimer();
		saveSettings("settings");
	} else if (request.action == "headers") {
		chameleon.headers[request.data.key] = request.data.value;

		if ((request.data.key == "spoofAcceptLangValue" && request.data.value == "ip" && chameleon.headers.spoofAcceptLang) ||
			(request.data.key == "spoofAcceptLang" && request.data.value && chameleon.headers.spoofAcceptLangValue == "ip")) {
			chameleon.ipInfo.update = 1;
		}

		saveSettings("headers");
	} else if (request.action == "option") {
		if (request.data.key == "enableTrackingProtection") {
			chrome.privacy.websites.trackingProtectionMode.set({
				"value": request.data.value ? "always" : "never"
			});
		} else if (request.data.key == "cookieConfig") {
			chrome.privacy.websites[request.data.key].set({
				"value": {
					behavior: request.data.value
				}
			});
		} else if (request.data.key == "firstPartyIsolate" ||
				   request.data.key == "resistFingerprinting") {
			chrome.privacy.websites[request.data.key].set({
				"value": request.data.value
			});
		} else if (request.data.key == "webRTCIPHandlingPolicy") {
			chrome.privacy.network[request.data.key].set({
				"value": request.data.value
			});
		} else {
			let tooltip = (plat) => {
				if (plat.os != "android") {
					let title = "Chameleon";
					if (tooltipData.os) title = `Chameleon | ${tooltipData.os} - ${tooltipData.browser}`;

					chrome.browserAction.setTitle({ title });
				}
			}

			if (request.data.key == "screenSize" || request.data.key == "enableScriptInjection") {
				var platformInfo = browser.runtime.getPlatformInfo();
				platformInfo.then(tooltip);
			}

			if (request.data.key == "timeZone" && request.data.value == "ip") {
				chameleon.ipInfo.update = 1;
			}

			chameleon.settings[request.data.key] = request.data.value;
			saveSettings("settings");
		}
	} else if (request.action == "storage") {
		let setIcon = (plat) => {
			// Firefox for Android doesn't support the browserAction API for icons
			if (plat.os != "android") {
				if (request.data.key == "useragent") {
					if (request.data.value == "real") {
						chrome.browserAction.setIcon({
							path: "img/icon_disabled_48.png"
						});
					} else {
						chrome.browserAction.setIcon({
							path: "img/icon_48.png"
						});
					}
				}
			}
		}

		browser.runtime.getPlatformInfo().then(setIcon);

		chameleon.settings[request.data.key] = request.data.value;
		saveSettings("settings");
	} else if (request.action == "whitelist") {
		if (request.data.key == "enableWhitelist") {
			chameleon.whitelist.enabled = request.data.value;
		} else if (request.data.key == "enableWhitelistRealProfile") {
			chameleon.whitelist.enableRealProfile = request.data.value;
		} else if (request.data.key == "wl_urls"){
			chameleon.whitelist.urlList = JSON.parse(request.data.value);
		} else if (request.data.key.indexOf("wl_") > -1) {
			chameleon.whitelist.profile[request.data.key.slice(3)] = request.data.value;
		}
		saveSettings("whitelist");
	}
});

browser.webRequest.onBeforeSendHeaders.addListener(
	rewriteHeaders, {
		urls: ["<all_urls>"]
	}, ["blocking", "requestHeaders"]
);

browser.webRequest.onHeadersReceived.addListener(
	rewriteResponseHeaders,{
		urls: ["<all_urls>"]
	}, ["blocking", "responseHeaders"]
);

chrome.alarms.onAlarm.addListener(() => { start(); });

browser.runtime.onInstalled.addListener((details) => {
	if (!details.temporary && details.reason == "install") {
		browser.tabs.create({
			url: "https://github.com/sereneblue/chameleon/wiki"
		});
	}
});

/*
	Chameleon Entry Point
*/

(async function run(){
	let data = await get(null);

	if (data.version == undefined) {
		saveSettings();
	}

	if (data.headers.hasOwnProperty('spoofEtag')) {
		var blockEtag = data.headers.spoofEtag;
		delete data.headers.spoofEtag;
		data.headers.blockEtag = blockEtag;

		for (var i in data.whitelist.urlList) {
			data.whitelist.urlList[i].lang = "";
		}
	}

	// check for exclusion settings
	if (data.excluded.win.length != uaList.win.length) {
		for (var os of ["win", "mac", "linux", "ios", "android"]) {
			var diff = chameleon.excluded[os].length - data.excluded[os].length;
			for (var i = 0; i < diff; i++) {
				data.excluded[os].push(false);
			}
		}
	}

	init(data);
	let plat = await browser.runtime.getPlatformInfo();

	if (chameleon.settings.useragent == "real") {
		if (plat.os != "android") {
			chrome.browserAction.setIcon({
				path: "img/icon_disabled_48.png"
			});
		}
	}

	if (chameleon.settings.timeZone == "ip" || (chameleon.headers.spoofAcceptLangValue == "ip" && chameleon.headers.spoofAcceptLang)) {
		chameleon.ipInfo.update = 1;
	}

	await save({ version: "0.10.3"});
	changeTimer();
})();