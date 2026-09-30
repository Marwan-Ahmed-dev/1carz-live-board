"use strict";exports.id=209,exports.ids=[209],exports.modules={36209:(e,t,r)=>{r.r(t),r.d(t,{CustomProvider:()=>V,ReCaptchaEnterpriseProvider:()=>G,ReCaptchaV3Provider:()=>U,getLimitedUseToken:()=>et,getToken:()=>ee,initializeAppCheck:()=>Q,onTokenChanged:()=>er,setTokenAutoRefreshEnabled:()=>Z});var i=r(93659),o=r(77752),n=r(2377),a=r(65036);/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let s=new Map,c={activated:!1,tokenObservers:[]},l={initialized:!1,enabled:!1};function h(e){return s.get(e)||Object.assign({},c)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let u="https://content-firebaseappcheck.googleapis.com/v1",p={RETRIAL_MIN_WAIT:3e4,RETRIAL_MAX_WAIT:96e4};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class d{constructor(e,t,r,i,o){if(this.operation=e,this.retryPolicy=t,this.getWaitDuration=r,this.lowerBound=i,this.upperBound=o,this.pending=null,this.nextErrorWaitInterval=i,i>o)throw Error("Proactive refresh lower bound greater than upper bound!")}start(){this.nextErrorWaitInterval=this.lowerBound,this.process(!0).catch(()=>{})}stop(){this.pending&&(this.pending.reject("cancelled"),this.pending=null)}isRunning(){return!!this.pending}async process(e){this.stop();try{var t;this.pending=new n.BH,this.pending.promise.catch(e=>{}),await (t=this.getNextRun(e),new Promise(e=>{setTimeout(e,t)})),this.pending.resolve(),await this.pending.promise,this.pending=new n.BH,this.pending.promise.catch(e=>{}),await this.operation(),this.pending.resolve(),await this.pending.promise,this.process(!0).catch(()=>{})}catch(e){this.retryPolicy(e)?this.process(!1).catch(()=>{}):this.stop()}}getNextRun(e){if(e)return this.nextErrorWaitInterval=this.lowerBound,this.getWaitDuration();{let e=this.nextErrorWaitInterval;return this.nextErrorWaitInterval*=2,this.nextErrorWaitInterval>this.upperBound&&(this.nextErrorWaitInterval=this.upperBound),e}}}let f=new n.LL("appCheck","AppCheck",{"already-initialized":"You have already called initializeAppCheck() for FirebaseApp {$appName} with different options. To avoid this error, call initializeAppCheck() with the same options as when it was originally called. This will return the already initialized instance.","use-before-activation":"App Check is being used before initializeAppCheck() is called for FirebaseApp {$appName}. Call initializeAppCheck() before instantiating other Firebase services.","fetch-network-error":"Fetch failed to connect to a network. Check Internet connection. Original error: {$originalErrorMessage}.","fetch-parse-error":"Fetch client could not parse response. Original error: {$originalErrorMessage}.","fetch-status-error":"Fetch server returned an HTTP error status. HTTP status: {$httpStatus}.","storage-open":"Error thrown when opening storage. Original error: {$originalErrorMessage}.","storage-get":"Error thrown when reading from storage. Original error: {$originalErrorMessage}.","storage-set":"Error thrown when writing to storage. Original error: {$originalErrorMessage}.","recaptcha-error":"ReCAPTCHA error.",throttled:"Requests throttled due to {$httpStatus} error. Attempts allowed again after {$time}"});/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function g(e=!1){var t;return e?null===(t=self.grecaptcha)||void 0===t?void 0:t.enterprise:self.grecaptcha}function k(e){if(!h(e).activated)throw f.create("use-before-activation",{appName:e.name})}function w(e){let t=Math.round(e/1e3),r=Math.floor(t/86400),i=Math.floor((t-86400*r)/3600),o=Math.floor((t-86400*r-3600*i)/60),n="";return r&&(n+=v(r)+"d:"),i&&(n+=v(i)+"h:"),n+=v(o)+"m:"+v(t-86400*r-3600*i-60*o)+"s"}function v(e){return 0===e?"00":e>=10?e.toString():"0"+e}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function m({url:e,body:t},r){let i,o;let n={"Content-Type":"application/json"},a=r.getImmediate({optional:!0});if(a){let e=await a.getHeartbeatsHeader();e&&(n["X-Firebase-Client"]=e)}let s={method:"POST",body:JSON.stringify(t),headers:n};try{i=await fetch(e,s)}catch(e){throw f.create("fetch-network-error",{originalErrorMessage:null==e?void 0:e.message})}if(200!==i.status)throw f.create("fetch-status-error",{httpStatus:i.status});try{o=await i.json()}catch(e){throw f.create("fetch-parse-error",{originalErrorMessage:null==e?void 0:e.message})}let c=o.ttl.match(/^([\d.]+)(s)$/);if(!c||!c[2]||isNaN(Number(c[1])))throw f.create("fetch-parse-error",{originalErrorMessage:`ttl field (timeToLive) is not in standard Protobuf Duration format: ${o.ttl}`});let l=1e3*Number(c[1]),h=Date.now();return{token:o.token,expireTimeMillis:h+l,issuedAtTimeMillis:h}}function E(e,t){let{projectId:r,appId:i,apiKey:o}=e.options;return{url:`${u}/projects/${r}/apps/${i}:exchangeDebugToken?key=${o}`,body:{debug_token:t}}}let T="firebase-app-check-store",b="debug-token",A=null;function _(){return A||(A=new Promise((e,t)=>{try{let r=indexedDB.open("firebase-app-check-database",1);r.onsuccess=t=>{e(t.target.result)},r.onerror=e=>{var r;t(f.create("storage-open",{originalErrorMessage:null===(r=e.target.error)||void 0===r?void 0:r.message}))},r.onupgradeneeded=e=>{let t=e.target.result;0===e.oldVersion&&t.createObjectStore(T,{keyPath:"compositeKey"})}}catch(e){t(f.create("storage-open",{originalErrorMessage:null==e?void 0:e.message}))}}))}async function y(e,t){let r=(await _()).transaction(T,"readwrite"),i=r.objectStore(T).put({compositeKey:e,value:t});return new Promise((e,t)=>{i.onsuccess=t=>{e()},r.onerror=e=>{var r;t(f.create("storage-set",{originalErrorMessage:null===(r=e.target.error)||void 0===r?void 0:r.message}))}})}async function P(e){let t=(await _()).transaction(T,"readonly"),r=t.objectStore(T).get(e);return new Promise((e,i)=>{r.onsuccess=t=>{let r=t.target.result;r?e(r.value):e(void 0)},t.onerror=e=>{var t;i(f.create("storage-get",{originalErrorMessage:null===(t=e.target.error)||void 0===t?void 0:t.message}))}})}function C(e){return`${e.options.appId}-${e.name}`}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let R=new a.Yd("@firebase/app-check");/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function I(e){if((0,n.hl)()){let t;try{t=await P(C(e))}catch(e){R.warn(`Failed to read token from IndexedDB. Error: ${e}`)}return t}}function S(e,t){return(0,n.hl)()?y(C(e),t).catch(e=>{R.warn(`Failed to write token to IndexedDB. Error: ${e}`)}):Promise.resolve()}async function D(){let e;try{e=await P(b)}catch(e){}if(e)return e;{let e=(0,n.k$)();return y(b,e).catch(e=>R.warn(`Failed to persist debug token to IndexedDB. Error: ${e}`)),e}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function x(){return l.enabled}async function M(){if(l.enabled&&l.token)return l.token.promise;throw Error(`
            Can't get debug token in production mode.
        `)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let O={error:"UNKNOWN_ERROR"};async function $(e,t=!1){let r,i;let o=e.app;k(o);let n=h(o),a=n.token;if(a&&!L(a)&&(n.token=void 0,a=void 0),!a){let e=await n.cachedTokenPromise;e&&(L(e)?a=e:await S(o,void 0))}if(!t&&a&&L(a))return{token:a.token};let s=!1;if(x()){n.exchangeTokenPromise||(n.exchangeTokenPromise=m(E(o,await M()),e.heartbeatServiceProvider).finally(()=>{n.exchangeTokenPromise=void 0}),s=!0);let t=await n.exchangeTokenPromise;return await S(o,t),n.token=t,{token:t.token}}try{n.exchangeTokenPromise||(n.exchangeTokenPromise=n.provider.getToken().finally(()=>{n.exchangeTokenPromise=void 0}),s=!0),a=await h(o).exchangeTokenPromise}catch(e){"appCheck/throttled"===e.code?R.warn(e.message):R.error(e),i=e}return a?i?r=L(a)?{token:a.token,internalError:i}:j(i):(r={token:a.token},n.token=a,await S(o,a)):r=j(i),s&&K(o,r),r}async function N(e){let t=e.app;k(t);let{provider:r}=h(t);if(x()){let r=await M(),{token:i}=await m(E(t,r),e.heartbeatServiceProvider);return{token:i}}{let{token:e}=await r.getToken();return{token:e}}}function B(e,t,r,i){let{app:o}=e,n=h(o);if(n.tokenObservers=[...n.tokenObservers,{next:r,error:i,type:t}],n.token&&L(n.token)){let t=n.token;Promise.resolve().then(()=>{r({token:t.token}),z(e)}).catch(()=>{})}n.cachedTokenPromise.then(()=>z(e))}function H(e,t){let r=h(e),i=r.tokenObservers.filter(e=>e.next!==t);0===i.length&&r.tokenRefresher&&r.tokenRefresher.isRunning()&&r.tokenRefresher.stop(),r.tokenObservers=i}function z(e){let{app:t}=e,r=h(t),i=r.tokenRefresher;i||(i=function(e){let{app:t}=e;return new d(async()=>{let r;if((r=h(t).token?await $(e,!0):await $(e)).error)throw r.error;if(r.internalError)throw r.internalError},()=>!0,()=>{let e=h(t);if(!e.token)return 0;{let t=e.token.issuedAtTimeMillis+(e.token.expireTimeMillis-e.token.issuedAtTimeMillis)*.5+3e5;return Math.max(0,(t=Math.min(t,e.token.expireTimeMillis-3e5))-Date.now())}},p.RETRIAL_MIN_WAIT,p.RETRIAL_MAX_WAIT)}(e),r.tokenRefresher=i),!i.isRunning()&&r.isTokenAutoRefreshEnabled&&i.start()}function K(e,t){for(let r of h(e).tokenObservers)try{"EXTERNAL"===r.type&&null!=t.error?r.error(t.error):r.next(t)}catch(e){}}function L(e){return e.expireTimeMillis-Date.now()>0}function j(e){return{token:n.US.encodeString(JSON.stringify(O),!1),error:e}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class q{constructor(e,t){this.app=e,this.heartbeatServiceProvider=t}_delete(){let{tokenObservers:e}=h(this.app);for(let t of e)H(this.app,t.next);return Promise.resolve()}}function F(e,t,r,i,o){r.ready(()=>{(function(e,t,r,i){let o=r.render(i,{sitekey:t,size:"invisible",callback:()=>{h(e).reCAPTCHAState.succeeded=!0},"error-callback":()=>{h(e).reCAPTCHAState.succeeded=!1}}),n=h(e);n.reCAPTCHAState=Object.assign(Object.assign({},n.reCAPTCHAState),{widgetId:o})})(e,t,r,i),o.resolve(r)})}function W(e){let t=`fire_app_check_${e.name}`,r=document.createElement("div");return r.id=t,r.style.display="none",document.body.appendChild(r),t}async function X(e){k(e);let t=h(e).reCAPTCHAState,r=await t.initialized.promise;return new Promise((t,i)=>{let o=h(e).reCAPTCHAState;r.ready(()=>{t(r.execute(o.widgetId,{action:"fire_app_check"}))})})}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class U{constructor(e){this._siteKey=e,this._throttleData=null}async getToken(){var e,t,r;let i;J(this._throttleData);let o=await X(this._app).catch(e=>{throw f.create("recaptcha-error")});if(!(null===(e=h(this._app).reCAPTCHAState)||void 0===e?void 0:e.succeeded))throw f.create("recaptcha-error");try{i=await m(function(e,t){let{projectId:r,appId:i,apiKey:o}=e.options;return{url:`${u}/projects/${r}/apps/${i}:exchangeRecaptchaV3Token?key=${o}`,body:{recaptcha_v3_token:t}}}(this._app,o),this._heartbeatServiceProvider)}catch(e){if(null===(t=e.code)||void 0===t?void 0:t.includes("fetch-status-error"))throw this._throttleData=Y(Number(null===(r=e.customData)||void 0===r?void 0:r.httpStatus),this._throttleData),f.create("throttled",{time:w(this._throttleData.allowRequestsAfter-Date.now()),httpStatus:this._throttleData.httpStatus});throw e}return this._throttleData=null,i}initialize(e){this._app=e,this._heartbeatServiceProvider=(0,i.qX)(e,"heartbeat"),(function(e,t){let r=new n.BH;h(e).reCAPTCHAState={initialized:r};let i=W(e),o=g(!1);return o?F(e,t,o,i,r):function(e){let t=document.createElement("script");t.src="https://www.google.com/recaptcha/api.js",t.onload=e,document.head.appendChild(t)}(()=>{let o=g(!1);if(!o)throw Error("no recaptcha");F(e,t,o,i,r)}),r.promise})(e,this._siteKey).catch(()=>{})}isEqual(e){return e instanceof U&&this._siteKey===e._siteKey}}class G{constructor(e){this._siteKey=e,this._throttleData=null}async getToken(){var e,t,r;let i;J(this._throttleData);let o=await X(this._app).catch(e=>{throw f.create("recaptcha-error")});if(!(null===(e=h(this._app).reCAPTCHAState)||void 0===e?void 0:e.succeeded))throw f.create("recaptcha-error");try{i=await m(function(e,t){let{projectId:r,appId:i,apiKey:o}=e.options;return{url:`${u}/projects/${r}/apps/${i}:exchangeRecaptchaEnterpriseToken?key=${o}`,body:{recaptcha_enterprise_token:t}}}(this._app,o),this._heartbeatServiceProvider)}catch(e){if(null===(t=e.code)||void 0===t?void 0:t.includes("fetch-status-error"))throw this._throttleData=Y(Number(null===(r=e.customData)||void 0===r?void 0:r.httpStatus),this._throttleData),f.create("throttled",{time:w(this._throttleData.allowRequestsAfter-Date.now()),httpStatus:this._throttleData.httpStatus});throw e}return this._throttleData=null,i}initialize(e){this._app=e,this._heartbeatServiceProvider=(0,i.qX)(e,"heartbeat"),(function(e,t){let r=new n.BH;h(e).reCAPTCHAState={initialized:r};let i=W(e),o=g(!0);return o?F(e,t,o,i,r):function(e){let t=document.createElement("script");t.src="https://www.google.com/recaptcha/enterprise.js",t.onload=e,document.head.appendChild(t)}(()=>{let o=g(!0);if(!o)throw Error("no recaptcha");F(e,t,o,i,r)}),r.promise})(e,this._siteKey).catch(()=>{})}isEqual(e){return e instanceof G&&this._siteKey===e._siteKey}}class V{constructor(e){this._customProviderOptions=e}async getToken(){let e=await this._customProviderOptions.getToken(),t=(0,n.DO)(e.token),r=null!==t&&t<Date.now()&&t>0?1e3*t:Date.now();return Object.assign(Object.assign({},e),{issuedAtTimeMillis:r})}initialize(e){this._app=e}isEqual(e){return e instanceof V&&this._customProviderOptions.getToken.toString()===e._customProviderOptions.getToken.toString()}}function Y(e,t){if(404===e||403===e)return{backoffCount:1,allowRequestsAfter:Date.now()+864e5,httpStatus:e};{let r=t?t.backoffCount:0,i=(0,n.$s)(r,1e3,2);return{backoffCount:r+1,allowRequestsAfter:Date.now()+i,httpStatus:e}}}function J(e){if(e&&Date.now()-e.allowRequestsAfter<=0)throw f.create("throttled",{time:w(e.allowRequestsAfter-Date.now()),httpStatus:e.httpStatus})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Q(e=(0,i.Mq)(),t){e=(0,n.m9)(e);let r=(0,i.qX)(e,"app-check");if(l.initialized||function(){let e=(0,n.Rd)();if(l.initialized=!0,"string"!=typeof e.FIREBASE_APPCHECK_DEBUG_TOKEN&&!0!==e.FIREBASE_APPCHECK_DEBUG_TOKEN)return;l.enabled=!0;let t=new n.BH;l.token=t,"string"==typeof e.FIREBASE_APPCHECK_DEBUG_TOKEN?t.resolve(e.FIREBASE_APPCHECK_DEBUG_TOKEN):t.resolve(D())}(),x()&&M().then(e=>console.log(`App Check debug token: ${e}. You will need to add it to your app's App Check settings in the Firebase console for it to work.`)),r.isInitialized()){let i=r.getImmediate(),o=r.getOptions();if(o.isTokenAutoRefreshEnabled===t.isTokenAutoRefreshEnabled&&o.provider.isEqual(t.provider))return i;throw f.create("already-initialized",{appName:e.name})}let o=r.initialize({options:t});return function(e,t,r){var i;let o=(i=Object.assign({},c),s.set(e,i),s.get(e));o.activated=!0,o.provider=t,o.cachedTokenPromise=I(e).then(t=>(t&&L(t)&&(o.token=t,K(e,{token:t.token})),t)),o.isTokenAutoRefreshEnabled=void 0===r?e.automaticDataCollectionEnabled:r,o.provider.initialize(e)}(e,t.provider,t.isTokenAutoRefreshEnabled),h(e).isTokenAutoRefreshEnabled&&B(o,"INTERNAL",()=>{}),o}function Z(e,t){let r=h(e.app);r.tokenRefresher&&(!0===t?r.tokenRefresher.start():r.tokenRefresher.stop()),r.isTokenAutoRefreshEnabled=t}async function ee(e,t){let r=await $(e,t);if(r.error)throw r.error;return{token:r.token}}function et(e){return N(e)}function er(e,t,r,i){let o=()=>{},n=()=>{};return o=null!=t.next?t.next.bind(t):t,null!=t.error?n=t.error.bind(t):r&&(n=r),B(e,"EXTERNAL",o,n),()=>H(e.app,o)}let ei="app-check-internal";(0,i.Xd)(new o.wA("app-check",e=>new q(e.getProvider("app").getImmediate(),e.getProvider("heartbeat")),"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((e,t,r)=>{e.getProvider(ei).initialize()})),(0,i.Xd)(new o.wA(ei,e=>{var t;return t=e.getProvider("app-check").getImmediate(),{getToken:e=>$(t,e),getLimitedUseToken:()=>N(t),addTokenListener:e=>B(t,"INTERNAL",e),removeTokenListener:e=>H(t.app,e)}},"PUBLIC").setInstantiationMode("EXPLICIT")),(0,i.KN)("@firebase/app-check","0.8.8")}};