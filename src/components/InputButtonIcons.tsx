// DataBrothers React icon component foundation (MIT). Compact outline glyphs.
import * as React from "react";
const Svg = (p: { children: React.ReactNode; className?: string }) => <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={p.className}>{p.children}</svg>;
export function SearchIcon() { return <Svg><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 4.5 4.5"/></Svg>; }
export function CrossIcon() { return <Svg><path d="m7 7 10 10M17 7 7 17"/></Svg>; }
export function EraserIcon() { return <Svg><path d="m8.5 19-5.7-5.7a1.5 1.5 0 0 1 0-2.1l8.4-8.4a1.5 1.5 0 0 1 2.1 0l7.4 7.4a1.5 1.5 0 0 1 0 2.1L14 19H8.5Z"/><path d="m7.5 6.5 9 9M8.5 19H21"/></Svg>; }
export function GearIcon() { return <Svg><path d="m9.9 3-.5 2.1-2 .9-2-.6-2.1 3.6 1.6 1.5-.2 2.3L3.1 14l2.1 3.6 2-.6 2.1 1 .5 2h4.3l.5-2 2.1-1 2 .6 2.1-3.6-1.6-1.2-.2-2.3 1.6-1.5-2.1-3.6-2 .6-2-.9-.5-2.1H9.9Z"/><circle cx="12" cy="11.5" r="3"/></Svg>; }
export function CalendarIcon() { return <Svg><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v5M16 3v5M4 10h16"/></Svg>; }
export function SlidersIcon() { return <Svg><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></Svg>; }
export function ChevronDownIcon() { return <Svg className="ff-chev"><path d="m7 10 5 5 5-5"/></Svg>; }
export function BackIcon() { return <Svg><path d="m14.5 6-6 6 6 6"/></Svg>; }
export function PrevIcon() { return <Svg><path d="m14 7-5 5 5 5"/></Svg>; }
export function NextIcon() { return <Svg><path d="m10 7 5 5-5 5"/></Svg>; }
export function CheckIcon() { return <Svg><path d="m5 12.5 4.5 4.5L19 7.5"/></Svg>; }
export function BoxIcon(p: { checked: boolean }) { return <Svg className="ff-box">{p.checked ? <><rect x="4" y="4" width="16" height="16" rx="3" className="ff-box-on"/><path d="m8 12.5 3 3 5.5-6.5" className="ff-box-tick"/></> : <rect x="4.5" y="4.5" width="15" height="15" rx="3"/>}</Svg>; }
export function InfoIcon() { return <Svg><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.1"/></Svg>; }
export function AlertIcon() { return <Svg><path d="M12 4 2.8 19.5h18.4L12 4Z"/><path d="M12 10v4.5M12 17.2v.1"/></Svg>; }
export function ResetIcon() { return <Svg><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9"/><path d="M4.5 4.5V9H9"/></Svg>; }
export function MoreIcon() { return <Svg><circle cx="6" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/></Svg>; }
