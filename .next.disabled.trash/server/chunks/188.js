"use strict";exports.id=188,exports.ids=[188],exports.modules={24230:(e,t,a)=>{a.d(t,{Z:()=>r});/**
 * @license lucide-react v0.439.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let r=(0,a(62881).Z)("ArrowRight",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]])},31215:(e,t,a)=>{a.d(t,{Z:()=>r});/**
 * @license lucide-react v0.439.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let r=(0,a(62881).Z)("Save",[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]])},39888:!1,60900:(e,t,a)=>{a.d(t,{a:()=>u});var r=a(17577);a(42793);var s=a(51641);function u(){let[e,t]=(0,r.useState)([]),[a,u]=(0,r.useState)(!0),[d,c]=(0,r.useState)(null),[l,h]=(0,r.useState)("empty"),n=(0,r.useRef)(new Set),[k,o]=(0,r.useState)(0);return{entries:e,loading:a,error:d,source:l,refresh:(0,r.useCallback)(()=>{o(e=>e+1)},[]),notifyReadSuccess:(0,r.useCallback)(()=>{n.current.forEach(e=>{try{e()}catch(e){s.k.warn("[useMarketEntries] read listener threw:",e)}})},[]),onReadSuccess:(0,r.useCallback)(e=>(n.current.add(e),()=>{n.current.delete(e)}),[])}}}};