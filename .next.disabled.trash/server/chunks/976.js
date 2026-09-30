"use strict";exports.id=976,exports.ids=[976],exports.modules={941:(e,t,a)=>{a.d(t,{Z:()=>r});/**
 * @license lucide-react v0.439.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let r=(0,a(62881).Z)("ChevronDown",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]])},11890:(e,t,a)=>{a.d(t,{Z:()=>r});/**
 * @license lucide-react v0.439.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let r=(0,a(62881).Z)("ChevronLeft",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]])},77506:(e,t,a)=>{a.d(t,{Z:()=>r});/**
 * @license lucide-react v0.439.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let r=(0,a(62881).Z)("LoaderCircle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]])},31215:(e,t,a)=>{a.d(t,{Z:()=>r});/**
 * @license lucide-react v0.439.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let r=(0,a(62881).Z)("Save",[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]])},88307:(e,t,a)=>{a.d(t,{Z:()=>r});/**
 * @license lucide-react v0.439.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let r=(0,a(62881).Z)("Search",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]])},33734:(e,t,a)=>{a.d(t,{Z:()=>r});/**
 * @license lucide-react v0.439.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let r=(0,a(62881).Z)("Star",[["polygon",{points:"12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2",key:"8f66p6"}]])},24061:(e,t,a)=>{a.d(t,{Z:()=>r});/**
 * @license lucide-react v0.439.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let r=(0,a(62881).Z)("Users",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["path",{d:"M16 3.13a4 4 0 0 1 0 7.75",key:"1da9ce"}]])},77976:!1,15502:(e,t,a)=>{a.d(t,{Em:()=>l,TA:()=>d,rp:()=>i});let r={active:{label:"متاحة",lightClass:"bg-green-600 text-white",adminClass:"bg-green-500 text-slate-900",pickerClass:"bg-green-600 text-white border-green-700"},reserved:{label:"محجوزة",lightClass:"bg-orange-500 text-white",adminClass:"bg-orange-400 text-slate-900",pickerClass:"bg-orange-500 text-white border-orange-600"},sold:{label:"مباعة",lightClass:"bg-red-600 text-white",adminClass:"bg-red-500 text-white",pickerClass:"bg-red-600 text-white border-red-700"},inactive:{label:"غير معروضة",lightClass:"bg-slate-500 text-white",adminClass:"bg-slate-500 text-white",pickerClass:"bg-slate-500 text-white border-slate-600"}},l=[{value:"active",label:r.active.label},{value:"reserved",label:r.reserved.label},{value:"sold",label:r.sold.label}];function d(e){return r[e]||r.active}function i(e){return d(e).label}},77370:(e,t,a)=>{a.d(t,{iE:()=>n,mD:()=>s,sS:()=>i});var r=a(76),l=a(90445);a(51641);let d="groups";async function i(e,t=[]){let a=e.trim();if(!a)throw Error("اسم المجموعة مطلوب");let i=l.I8.currentUser?.uid;if(!i)throw Error("يجب تسجيل الدخول");return(await (0,r.ET)((0,r.hJ)(l.db,d),{name:a,memberUids:t,created_by_uid:i,created_at:(0,r.Bt)(),updated_at:(0,r.Bt)()})).id}async function s(e,t){let a={updated_at:(0,r.Bt)()};if("string"==typeof t.name){let e=t.name.trim();if(!e)throw Error("اسم المجموعة مطلوب");a.name=e}Array.isArray(t.memberUids)&&(a.memberUids=Array.from(new Set(t.memberUids))),await (0,r.r7)((0,r.JU)(l.db,d,e),a)}async function n(e){await (0,r.oe)((0,r.JU)(l.db,d,e))}}};