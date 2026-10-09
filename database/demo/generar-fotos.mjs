// Genera las ilustraciones de demostración (SVG/HTML -> JPG/PNG con Playwright + Edge).
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });

// ---------- dibujos (viewBox 0 0 600 450) ----------
const D = {
  ps5: (o = {}) => `
    <ellipse cx="300" cy="400" rx="120" ry="14" fill="#000" opacity=".25"/>
    <rect x="262" y="70" width="76" height="320" rx="14" fill="#15161c"/>
    <rect x="296" y="82" width="8" height="296" rx="4" fill="#3d8bff" opacity=".85"/>
    <path d="M262 74 C 215 60, 196 96, 204 140 L 226 372 C 230 394, 250 398, 264 390 Z" fill="${o.wing || '#f4f5f8'}"/>
    <path d="M338 74 C 385 60, 404 96, 396 140 L 374 372 C 370 394, 350 398, 336 390 Z" fill="${o.wing2 || '#e6e8ee'}"/>
    <path d="M214 120 C 216 100, 232 86, 254 84" stroke="#fff" stroke-width="5" fill="none" opacity=".8"/>
    <rect x="240" y="388" width="120" height="12" rx="6" fill="#20222a"/>`,
  ps4: (o = {}) => `
    <ellipse cx="310" cy="330" rx="210" ry="22" fill="#000" opacity=".25"/>
    <path d="M110 220 L360 150 L500 205 L250 285 Z" fill="${o.top || '#26282f'}"/>
    <path d="M250 285 L500 205 L500 236 L250 318 Z" fill="#14151a"/>
    <path d="M110 220 L250 285 L250 318 L110 250 Z" fill="#1c1d23"/>
    <path d="M180 240 L420 170" stroke="#3a3d46" stroke-width="3"/>
    <path d="M270 300 L490 228" stroke="#3d8bff" stroke-width="2" opacity=".6"/>
    ${o.pro ? '<path d="M110 205 L360 135 L500 190 L500 205 L360 150 L110 220 Z" fill="#30333b"/>' : ''}`,
  xboxx: () => `
    <ellipse cx="320" cy="402" rx="120" ry="14" fill="#000" opacity=".25"/>
    <path d="M230 110 L290 80 L410 80 L350 110 Z" fill="#2a2c30"/>
    <ellipse cx="320" cy="95" rx="46" ry="11" fill="#107c10"/>
    <ellipse cx="320" cy="95" rx="40" ry="8" fill="#0b3d0b"/>
    <rect x="230" y="110" width="120" height="290" fill="#1a1b1e"/>
    <path d="M350 110 L410 80 L410 370 L350 400 Z" fill="#101113"/>
    <circle cx="250" cy="130" r="5" fill="#e8e8e8"/>
    <rect x="245" y="160" width="90" height="4" rx="2" fill="#2c2e33"/>`,
  xboxs: () => `
    <ellipse cx="320" cy="400" rx="110" ry="14" fill="#000" opacity=".22"/>
    <path d="M240 120 L290 95 L410 95 L360 120 Z" fill="#e3e5e9"/>
    <rect x="240" y="120" width="120" height="275" fill="#f6f7f9"/>
    <path d="M360 120 L410 95 L410 370 L360 395 Z" fill="#d3d6dc"/>
    <ellipse cx="385" cy="200" rx="18" ry="48" fill="#17181b" transform="rotate(-8 385 200)"/>
    <circle cx="260" cy="140" r="5" fill="#9aa0a8"/>`,
  xboxone: () => `
    <ellipse cx="300" cy="330" rx="220" ry="20" fill="#000" opacity=".25"/>
    <path d="M100 200 L170 160 L500 160 L430 200 Z" fill="#202125"/>
    <path d="M100 200 L170 160 L330 160 L260 200 Z" fill="#2c2d33"/>
    <rect x="100" y="200" width="330" height="110" fill="#17181b"/>
    <path d="M430 200 L500 160 L500 270 L430 310 Z" fill="#0f1012"/>
    <rect x="100" y="200" width="330" height="40" fill="#24252a"/>
    <circle cx="400" cy="220" r="7" fill="#e8e8e8"/>
    <rect x="130" y="270" width="110" height="5" rx="2.5" fill="#2e3036"/>`,
  switch: (o = {}) => `
    <ellipse cx="300" cy="330" rx="200" ry="16" fill="#000" opacity=".22"/>
    <rect x="${o.oled ? 172 : 180}" y="140" width="${o.oled ? 256 : 240}" height="160" rx="10" fill="#1b1c20"/>
    <rect x="${o.oled ? 180 : 196}" y="150" width="${o.oled ? 240 : 208}" height="140" rx="4" fill="url(#pantalla)"/>
    <path d="M${o.oled ? 172 : 180} 140 h-38 a 40 40 0 0 0 -40 40 v 80 a 40 40 0 0 0 40 40 h38 Z" fill="${o.l || '#00b4e6'}"/>
    <path d="M${o.oled ? 428 : 420} 140 h38 a 40 40 0 0 1 40 40 v 80 a 40 40 0 0 1 -40 40 h-38 Z" fill="${o.r || '#ff4554'}"/>
    <circle cx="${o.oled ? 134 : 142}" cy="185" r="15" fill="#2a2b30"/><circle cx="${o.oled ? 134 : 142}" cy="185" r="10" fill="#3a3b42"/>
    <g fill="#2a2b30"><circle cx="${o.oled ? 134 : 142}" cy="245" r="7"/><circle cx="${o.oled ? 120 : 128}" cy="259" r="7"/><circle cx="${o.oled ? 148 : 156}" cy="259" r="7"/><circle cx="${o.oled ? 134 : 142}" cy="273" r="7"/></g>
    <circle cx="${o.oled ? 466 : 458}" cy="255" r="15" fill="#2a2b30"/><circle cx="${o.oled ? 466 : 458}" cy="255" r="10" fill="#3a3b42"/>
    <g fill="#2a2b30"><circle cx="${o.oled ? 466 : 458}" cy="168" r="7"/><circle cx="${o.oled ? 452 : 444}" cy="182" r="7"/><circle cx="${o.oled ? 480 : 472}" cy="182" r="7"/><circle cx="${o.oled ? 466 : 458}" cy="196" r="7"/></g>`,
  switchlite: (o = {}) => `
    <ellipse cx="300" cy="320" rx="200" ry="16" fill="#000" opacity=".22"/>
    <rect x="110" y="150" width="380" height="150" rx="60" fill="${o.c || '#3cc4b4'}"/>
    <rect x="200" y="162" width="200" height="126" rx="6" fill="#1b1c20"/>
    <rect x="210" y="170" width="180" height="110" rx="3" fill="url(#pantalla)"/>
    <circle cx="155" cy="195" r="16" fill="#2a2b30"/>
    <g fill="#2a2b30"><circle cx="155" cy="245" r="7"/><circle cx="141" cy="259" r="7"/><circle cx="169" cy="259" r="7"/><circle cx="155" cy="273" r="7"/></g>
    <circle cx="445" cy="255" r="16" fill="#2a2b30"/>
    <g fill="#2a2b30"><circle cx="445" cy="180" r="7"/><circle cx="431" cy="194" r="7"/><circle cx="459" cy="194" r="7"/><circle cx="445" cy="208" r="7"/></g>`,
  vita: () => `
    <ellipse cx="300" cy="330" rx="200" ry="16" fill="#000" opacity=".22"/>
    <rect x="100" y="160" width="400" height="150" rx="75" fill="#16171b"/>
    <rect x="190" y="172" width="220" height="126" rx="6" fill="url(#pantalla)"/>
    <circle cx="160" cy="270" r="13" fill="#33353c"/><circle cx="440" cy="270" r="13" fill="#33353c"/>
    <path d="M150 205 h20 v-12 h12 v12 h20 v12 h-20 v12 h-12 v-12 h-20 Z" fill="#33353c" transform="translate(-10 0)"/>
    <g fill="none" stroke="#5b5e68" stroke-width="3"><circle cx="440" cy="196" r="7"/><circle cx="424" cy="212" r="7"/><circle cx="456" cy="212" r="7"/><circle cx="440" cy="228" r="7"/></g>`,
  mando: (o = {}) => `
    <ellipse cx="300" cy="385" rx="200" ry="14" fill="#000" opacity=".22"/>
    <path d="M180 160 Q300 140 420 160 Q472 170 492 228 L522 330 Q532 372 496 377 Q470 380 450 346 L422 300 L178 300 L150 346 Q130 380 104 377 Q68 372 78 330 L108 228 Q128 170 180 160 Z" fill="${o.c || '#f2f3f6'}"/>
    ${o.ps ? `<rect x="245" y="168" width="110" height="62" rx="12" fill="${o.c2 || '#e2e4ea'}"/>
      <path d="M140 172 Q170 160 200 165 L190 300 L178 300 L150 346 Q130 380 104 377 Q68 372 78 330 L108 228 Q118 190 140 172 Z" fill="#17181c" opacity="${o.c === '#17181c' ? 0 : 1}"/>
      <path d="M460 172 Q430 160 400 165 L410 300 L422 300 L450 346 Q470 380 496 377 Q532 372 522 330 L492 228 Q482 190 460 172 Z" fill="#17181c" opacity="${o.c === '#17181c' ? 0 : 1}"/>` : `<circle cx="300" cy="190" r="15" fill="#3d3f46"/><circle cx="300" cy="190" r="10" fill="#107c10" opacity=".9"/>`}
    <circle cx="${o.ps ? 240 : 175}" cy="${o.ps ? 270 : 215}" r="25" fill="#2a2b30"/><circle cx="${o.ps ? 240 : 175}" cy="${o.ps ? 270 : 215}" r="17" fill="#3c3e46"/>
    <circle cx="${o.ps ? 360 : 360}" cy="270" r="25" fill="#2a2b30"/><circle cx="360" cy="270" r="17" fill="#3c3e46"/>
    <path d="M${o.ps ? 155 : 228} ${o.ps ? 215 : 270} m-28 -8 h20 v-20 h16 v20 h20 v16 h-20 v20 h-16 v-20 h-20 Z" fill="${o.ps ? '#d0d3da' : '#2a2b30'}"/>
    <g>${o.ps
      ? '<circle cx="445" cy="190" r="10" fill="#d0d3da"/><circle cx="425" cy="212" r="10" fill="#d0d3da"/><circle cx="465" cy="212" r="10" fill="#d0d3da"/><circle cx="445" cy="234" r="10" fill="#d0d3da"/>'
      : '<circle cx="425" cy="190" r="11" fill="#e6b800"/><circle cx="403" cy="212" r="11" fill="#2a6fdb"/><circle cx="447" cy="212" r="11" fill="#d23b3b"/><circle cx="425" cy="234" r="11" fill="#1f9d3a"/>'}</g>
    ${o.drift ? '<g stroke="#ff5a5a" stroke-width="4" fill="none" opacity=".9"><path d="M200 300 a 45 45 0 0 1 -10 -60"/><path d="M212 318 a 65 65 0 0 1 -18 -90"/></g>' : ''}`,
  joycons: () => `
    <ellipse cx="300" cy="380" rx="170" ry="14" fill="#000" opacity=".22"/>
    <path d="M290 90 h-50 a 50 50 0 0 0 -50 50 v 180 a 50 50 0 0 0 50 50 h50 Z" fill="#00b4e6"/>
    <path d="M310 90 h50 a 50 50 0 0 1 50 50 v 180 a 50 50 0 0 1 -50 50 h-50 Z" fill="#ff4554"/>
    <circle cx="245" cy="160" r="22" fill="#2a2b30"/><circle cx="245" cy="160" r="15" fill="#3a3b42"/>
    <g fill="#2a2b30"><circle cx="245" cy="245" r="10"/><circle cx="225" cy="265" r="10"/><circle cx="265" cy="265" r="10"/><circle cx="245" cy="285" r="10"/></g>
    <circle cx="355" cy="275" r="22" fill="#2a2b30"/><circle cx="355" cy="275" r="15" fill="#3a3b42"/>
    <g fill="#2a2b30"><circle cx="355" cy="150" r="10"/><circle cx="335" cy="170" r="10"/><circle cx="375" cy="170" r="10"/><circle cx="355" cy="190" r="10"/></g>`,
  hdmi: () => `
    <ellipse cx="300" cy="380" rx="220" ry="14" fill="#000" opacity=".2"/>
    <path d="M150 300 C 150 120, 450 120, 450 260 C 450 360, 250 380, 250 250" stroke="#1d1e22" stroke-width="16" fill="none" stroke-linecap="round"/>
    <g transform="translate(150 300) rotate(0)"><rect x="-22" y="0" width="44" height="60" rx="6" fill="#2a2b30"/><rect x="-18" y="56" width="36" height="22" rx="2" fill="#c9ccd3"/><rect x="-12" y="62" width="24" height="8" fill="#8d9199"/></g>
    <g transform="translate(250 250) rotate(180)"><rect x="-22" y="0" width="44" height="60" rx="6" fill="#2a2b30"/><rect x="-18" y="56" width="36" height="22" rx="2" fill="#c9ccd3"/><rect x="-12" y="62" width="24" height="8" fill="#8d9199"/></g>
    <rect x="128" y="320" width="44" height="6" fill="#d4a017"/>`,
  cargador: () => `
    <ellipse cx="300" cy="370" rx="200" ry="14" fill="#000" opacity=".2"/>
    <rect x="140" y="170" width="150" height="170" rx="22" fill="#1d1e22"/>
    <rect x="160" y="190" width="110" height="20" rx="6" fill="#2e3036"/>
    <g fill="#c9ccd3"><rect x="180" y="130" width="12" height="44" rx="3"/><rect x="238" y="130" width="12" height="44" rx="3"/></g>
    <path d="M290 300 C 360 300, 340 200, 420 210 C 470 216, 470 270, 440 290" stroke="#1d1e22" stroke-width="12" fill="none" stroke-linecap="round"/>
    <rect x="420" y="285" width="40" height="56" rx="8" fill="#2a2b30" transform="rotate(-20 440 300)"/>
    <rect x="428" y="335" width="22" height="16" rx="5" fill="#c9ccd3" transform="rotate(-20 440 300)"/>`,
  pasta: () => `
    <ellipse cx="300" cy="350" rx="230" ry="14" fill="#000" opacity=".2"/>
    <g transform="rotate(-18 300 250)">
      <rect x="120" y="225" width="300" height="50" rx="10" fill="#e9ecf2" stroke="#c3c8d2" stroke-width="3"/>
      <rect x="140" y="232" width="220" height="36" rx="6" fill="#9ea4ae"/>
      <rect x="420" y="240" width="60" height="20" fill="#c3c8d2"/><rect x="480" y="215" width="14" height="70" rx="4" fill="#3a3d46"/>
      <path d="M120 238 L80 246 L80 254 L120 262 Z" fill="#c3c8d2"/>
      <rect x="170" y="236" width="120" height="28" rx="4" fill="#3d8bff"/>
      <text x="230" y="256" font-family="Segoe UI, Arial" font-size="16" font-weight="700" fill="#fff" text-anchor="middle">THERMAL</text>
    </g>
    <path d="M60 300 q 20 -14 40 0 t 40 0" stroke="#9ea4ae" stroke-width="10" fill="none" stroke-linecap="round"/>`,
  joystick: () => `
    <ellipse cx="300" cy="370" rx="160" ry="14" fill="#000" opacity=".2"/>
    <rect x="190" y="230" width="220" height="120" rx="8" fill="#1f7a4d"/>
    <g fill="#d4a017"><rect x="200" y="330" width="10" height="20"/><rect x="220" y="330" width="10" height="20"/><rect x="370" y="330" width="10" height="20"/><rect x="390" y="330" width="10" height="20"/></g>
    <rect x="220" y="200" width="160" height="110" rx="10" fill="#2a2b30"/>
    <rect x="290" y="130" width="20" height="90" rx="6" fill="#4a4c55"/>
    <ellipse cx="300" cy="125" rx="70" ry="22" fill="#3a3c44"/><ellipse cx="300" cy="118" rx="62" ry="17" fill="#50535d"/>
    <ellipse cx="300" cy="115" rx="40" ry="9" fill="#5d606b"/>`,
  ventilador: (o = {}) => `
    <ellipse cx="300" cy="400" rx="180" ry="14" fill="#000" opacity=".22"/>
    <rect x="140" y="70" width="320" height="320" rx="40" fill="#1d1e22"/>
    <circle cx="300" cy="230" r="140" fill="#101114"/>
    <g fill="${o.sucio ? '#6b6253' : '#2e3138'}">${Array.from({ length: 9 }, (_, i) => `<path d="M300 230 C 320 170, 380 120, 420 140 C 390 160, 350 190, 300 230 Z" transform="rotate(${i * 40} 300 230)"/>`).join('')}</g>
    <circle cx="300" cy="230" r="42" fill="${o.sucio ? '#7a7062' : '#3a3d46'}"/>
    <circle cx="300" cy="230" r="18" fill="${o.sucio ? '#8a8172' : '#4a4d57'}"/>
    ${o.sucio ? Array.from({ length: 140 }, (_, i) => { const a = (i * 137.5) % 360 * Math.PI / 180; const r = 40 + ((i * 53) % 110); return `<circle cx="${(300 + r * Math.cos(a)).toFixed(1)}" cy="${(230 + r * Math.sin(a)).toFixed(1)}" r="${2 + (i % 5)}" fill="#a39684" opacity=".75"/>`; }).join('') : ''}
    <g fill="#c9ccd3"><circle cx="170" cy="100" r="8"/><circle cx="430" cy="100" r="8"/><circle cx="170" cy="360" r="8"/><circle cx="430" cy="360" r="8"/></g>`,
  placa: (o = {}) => `
    <ellipse cx="300" cy="410" rx="240" ry="14" fill="#000" opacity=".22"/>
    <rect x="70" y="60" width="460" height="340" rx="14" fill="${o.pcb || '#14532d'}"/>
    <g stroke="#2f8f5b" stroke-width="3" fill="none" opacity=".75">
      ${Array.from({ length: 14 }, (_, i) => `<path d="M${90 + i * 30} 380 v-${60 + (i % 4) * 25} h${i % 2 ? 22 : -22} v-${40 + (i % 3) * 20}"/>`).join('')}
    </g>
    <rect x="220" y="140" width="150" height="150" rx="10" fill="#1b1c20"/>
    <rect x="245" y="165" width="100" height="100" rx="6" fill="${o.pasta ? '#9ea4ae' : '#b9bdc6'}"/>
    ${o.pasta ? '<path d="M260 190 q 30 -20 70 0 q -30 25 -70 50 q 40 10 70 0" stroke="#cfd3da" stroke-width="10" fill="none" stroke-linecap="round"/>' : '<text x="295" y="222" font-family="Segoe UI, Arial" font-size="16" font-weight="700" fill="#4a4d57" text-anchor="middle">APU</text>'}
    <g fill="#1b1c20"><rect x="400" y="110" width="80" height="40" rx="4"/><rect x="400" y="170" width="80" height="40" rx="4"/><rect x="110" y="110" width="80" height="40" rx="4"/><rect x="110" y="170" width="80" height="40" rx="4"/></g>
    <g fill="#d4a017"><rect x="84" y="80" width="10" height="10"/><rect x="506" y="80" width="10" height="10"/></g>
    <g transform="translate(410 330)">
      <rect x="0" y="0" width="100" height="48" rx="4" fill="#b9bdc6" stroke="${o.hdmiMalo ? '#ff5a5a' : '#8d9199'}" stroke-width="${o.hdmiMalo ? 5 : 2}"/>
      <path d="M12 12 h76 l-10 22 h-56 Z" fill="#1b1c20"/>
    </g>
    ${o.hdmiMalo ? '<circle cx="460" cy="354" r="58" fill="none" stroke="#ff5a5a" stroke-width="4" stroke-dasharray="10 8"/>' : ''}`,
  puerto: () => `
    <ellipse cx="300" cy="400" rx="230" ry="14" fill="#000" opacity=".2"/>
    <rect x="90" y="110" width="420" height="250" rx="16" fill="#c9ccd3" stroke="#8d9199" stroke-width="6"/>
    <path d="M130 150 h340 l-50 140 h-240 Z" fill="#17181c"/>
    <rect x="175" y="185" width="250" height="40" rx="4" fill="#2d2f36"/>
    <g fill="#d4a017">${Array.from({ length: 19 }, (_, i) => { const x = 185 + i * 12.5; const doblado = i === 6 || i === 7 || i === 12; return doblado ? `<path d="M${x} 205 l${i === 12 ? 10 : -10} 26 l4 0 l${i === 12 ? -6 : 6} -26 Z"/>` : `<rect x="${x}" y="190" width="6" height="${i % 2 ? 14 : 22}"/>`; }).join('')}</g>
    <circle cx="275" cy="225" r="55" fill="none" stroke="#ff5a5a" stroke-width="5" stroke-dasharray="12 8"/>
    <circle cx="335" cy="225" r="30" fill="none" stroke="#ff5a5a" stroke-width="4" stroke-dasharray="8 6"/>`,
  estuche: () => `
    <ellipse cx="300" cy="350" rx="230" ry="16" fill="#000" opacity=".22"/>
    <rect x="80" y="130" width="440" height="200" rx="90" fill="#2a2d36"/>
    <rect x="96" y="146" width="408" height="168" rx="78" fill="none" stroke="#c9364a" stroke-width="5" stroke-dasharray="6 5"/>
    <rect x="490" y="200" width="30" height="40" rx="8" fill="#c9364a"/>
    <path d="M250 230 h100" stroke="#3b3f4a" stroke-width="12" stroke-linecap="round"/>`,
  audifonos: () => `
    <ellipse cx="300" cy="395" rx="170" ry="14" fill="#000" opacity=".2"/>
    <path d="M170 280 C 170 110, 430 110, 430 280" stroke="#1d1e22" stroke-width="26" fill="none" stroke-linecap="round"/>
    <path d="M170 280 C 170 130, 430 130, 430 280" stroke="#3d8bff" stroke-width="6" fill="none" opacity=".7"/>
    <rect x="125" y="240" width="80" height="130" rx="34" fill="#17181c"/><rect x="395" y="240" width="80" height="130" rx="34" fill="#17181c"/>
    <rect x="140" y="258" width="50" height="94" rx="22" fill="#3d8bff" opacity=".85"/><rect x="410" y="258" width="50" height="94" rx="22" fill="#3d8bff" opacity=".85"/>
    <path d="M150 350 C 150 400, 220 410, 250 395" stroke="#17181c" stroke-width="8" fill="none" stroke-linecap="round"/><circle cx="255" cy="393" r="9" fill="#2a2b30"/>`,
  lector: () => `
    <ellipse cx="300" cy="380" rx="230" ry="14" fill="#000" opacity=".2"/>
    <rect x="90" y="110" width="420" height="250" rx="12" fill="#2a2c32"/>
    <rect x="105" y="125" width="390" height="220" rx="8" fill="#353841"/>
    <circle cx="260" cy="235" r="95" fill="#c9ccd3" opacity=".25"/>
    <circle cx="260" cy="235" r="22" fill="#1b1c20"/>
    <rect x="370" y="150" width="20" height="170" rx="6" fill="#5b5e68"/>
    <rect x="352" y="205" width="56" height="44" rx="6" fill="#4a4d57"/><circle cx="380" cy="227" r="10" fill="#3d8bff"/>
    <rect x="420" y="320" width="70" height="16" rx="3" fill="#d4a017"/>`,
};

const COLORES = {
  azul: ['#0f1b3d', '#1d3f8f', '#3d8bff'],
  morado: ['#1a1033', '#3c2483', '#8b5cf6'],
  verde: ['#0b2117', '#14532d', '#22c55e'],
  rojo: ['#2a0f14', '#7f1d2d', '#f43f5e'],
  naranja: ['#2a1608', '#7c3a0e', '#f59e0b'],
  turquesa: ['#06242a', '#0e5a63', '#14b8a6'],
  gris: ['#121318', '#2b2f3a', '#94a3b8'],
};

const DEFS = `<defs><linearGradient id="pantalla" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3d8bff"/><stop offset=".55" stop-color="#8b5cf6"/><stop offset="1" stop-color="#f43f5e"/></linearGradient></defs>`;

function svg(dibujo, opts) { return `<svg viewBox="0 0 600 450" xmlns="http://www.w3.org/2000/svg">${DEFS}${D[dibujo](opts)}</svg>`; }

function html({ dibujo, opts, tema = 'azul', titulo, subtitulo, etiqueta, split }) {
  const [c1, c2, c3] = COLORES[tema];
  const escena = split
    ? `<div class="split"><div class="mitad">${svg(split[0].dibujo, split[0].opts)}<span class="chip ${split[0].tono || ''}">${split[0].txt}</span></div><div class="mitad">${svg(split[1].dibujo, split[1].opts)}<span class="chip ok">${split[1].txt}</span></div></div>`
    : `<div class="item">${svg(dibujo, opts)}</div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;box-sizing:border-box} html,body{width:1200px;height:900px;overflow:hidden}
  body{font-family:'Segoe UI',Arial,sans-serif;background:
    radial-gradient(circle at 50% 42%, ${c2} 0%, ${c1} 62%, #07080c 100%);position:relative;color:#fff}
  .grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px);background-size:48px 48px;mask-image:radial-gradient(circle at 50% 50%,#000 30%,transparent 80%)}
  .halo{position:absolute;left:50%;top:46%;width:760px;height:760px;transform:translate(-50%,-50%);background:radial-gradient(circle, ${c3}55 0%, transparent 60%)}
  .mesa{position:absolute;left:0;right:0;bottom:0;height:200px;background:linear-gradient(180deg,transparent,rgba(0,0,0,.35))}
  .item{position:absolute;left:50%;top:47%;width:860px;transform:translate(-50%,-50%)} .item svg{width:100%;height:auto;display:block}
  .split{position:absolute;left:170px;right:170px;top:120px;bottom:170px;display:grid;grid-template-columns:1fr 1fr;gap:20px}
  .mitad{position:relative;border-radius:22px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);display:grid;place-items:center;overflow:hidden}
  .mitad svg{width:110%} .chip{position:absolute;top:14px;left:14px;font-size:15px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:6px 12px;border-radius:999px;background:#f43f5e} .chip.ok{background:#22c55e;color:#062312}
  .marca{position:absolute;top:34px;left:170px;display:flex;gap:10px;align-items:center;font-size:17px;font-weight:600;opacity:.9}
  .marca i{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#3d8bff,#8b5cf6);display:block}
  .tag{position:absolute;top:34px;right:170px;font-size:14px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:7px 14px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2)}
  .pie{position:absolute;left:170px;bottom:42px;padding:14px 20px;border-radius:16px;background:rgba(8,10,16,.55);border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(6px)}
  .pie b{display:block;font-size:26px;font-weight:700} .pie span{font-size:17px;opacity:.75}
  </style></head><body><div class="halo"></div><div class="grid"></div><div class="mesa"></div>${escena}
  <div class="marca"><i></i>Consolas Pro Service</div>${etiqueta ? `<div class="tag">${etiqueta}</div>` : ''}
  <div class="pie"><b>${titulo}</b>${subtitulo ? `<span>${subtitulo}</span>` : ''}</div></body></html>`;
}

const logoHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0} html,body{width:512px;height:512px;background:transparent;overflow:hidden;font-family:'Segoe UI',Arial,sans-serif}
.b{position:absolute;left:0;top:0;width:800px;height:800px;transform:scale(.64);transform-origin:0 0;border-radius:180px;background:radial-gradient(circle at 30% 20%,#3c2483 0%,#111633 55%,#07080c 100%);display:flex;flex-direction:column;align-items:center;justify-content:center}
svg{width:520px} .t{color:#fff;font-weight:800;font-size:92px;letter-spacing:.06em;margin-top:-10px} .s{color:#8fb6ff;font-weight:600;font-size:44px;letter-spacing:.42em;margin-top:2px;margin-left:.42em}
</style></head><body><div class="b">
<svg viewBox="0 0 600 330" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3d8bff"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs>
<path d="M180 60 Q300 40 420 60 Q472 70 492 128 L522 230 Q532 272 496 277 Q470 280 450 246 L422 200 L178 200 L150 246 Q130 280 104 277 Q68 272 78 230 L108 128 Q128 70 180 60 Z" fill="url(#g)"/>
<path d="M142 120 h20 v-20 h16 v20 h20 v16 h-20 v20 h-16 v-20 h-20 Z" fill="#fff"/>
<g fill="#fff"><circle cx="445" cy="98" r="11"/><circle cx="423" cy="120" r="11"/><circle cx="467" cy="120" r="11"/><circle cx="445" cy="142" r="11"/></g>
<g transform="translate(300 128) rotate(45)"><rect x="-11" y="-6" width="22" height="92" rx="11" fill="#fff" stroke="#111633" stroke-width="6"/><path d="M0 -62 a 34 34 0 1 1 -0.1 0 Z M-12 -64 h24 v30 h-24 Z" fill="#fff" fill-rule="evenodd" stroke="#111633" stroke-width="6"/><circle cx="0" cy="-30" r="34" fill="#fff"/><rect x="-12" y="-72" width="24" height="34" fill="#4d6cf5"/><circle cx="0" cy="62" r="6" fill="#8b5cf6"/></g>
</svg><div class="t">CONSOLAS</div><div class="s">PRO SERVICE</div></div></body></html>`;

// ---------- catálogo de imágenes ----------
const IMGS = {
  // fotos de recepción
  'demo-consola-ps5.jpg': { dibujo: 'ps5', tema: 'azul', titulo: 'PlayStation 5', subtitulo: 'Foto de recepción · vista general', etiqueta: 'Recepción' },
  'demo-consola-ps5-hdmi.jpg': { dibujo: 'puerto', tema: 'rojo', titulo: 'Puerto HDMI', subtitulo: 'Pines doblados al recibirla', etiqueta: 'Recepción' },
  'demo-consola-switch-oled.jpg': { dibujo: 'switch', opts: { oled: true, l: '#f4f5f8', r: '#f4f5f8' }, tema: 'rojo', titulo: 'Nintendo Switch OLED', subtitulo: 'Foto de recepción', etiqueta: 'Recepción' },
  'demo-consola-ps4-slim.jpg': { dibujo: 'ps4', tema: 'azul', titulo: 'PlayStation 4 Slim', subtitulo: 'Foto de recepción', etiqueta: 'Recepción' },
  'demo-consola-xbox-series-x.jpg': { dibujo: 'xboxx', tema: 'verde', titulo: 'Xbox Series X', subtitulo: 'Foto de recepción', etiqueta: 'Recepción' },
  'demo-consola-xbox-one.jpg': { dibujo: 'xboxone', tema: 'gris', titulo: 'Xbox One', subtitulo: 'Foto de recepción', etiqueta: 'Recepción' },
  'demo-consola-ps-vita.jpg': { dibujo: 'vita', tema: 'morado', titulo: 'PS Vita', subtitulo: 'Foto de recepción', etiqueta: 'Recepción' },
  'demo-consola-switch.jpg': { dibujo: 'switch', tema: 'rojo', titulo: 'Nintendo Switch', subtitulo: 'Foto de recepción', etiqueta: 'Recepción' },
  'demo-consola-xbox-series-s.jpg': { dibujo: 'xboxs', tema: 'verde', titulo: 'Xbox Series S', subtitulo: 'Foto de recepción', etiqueta: 'Recepción' },
  'demo-consola-ps4-pro.jpg': { dibujo: 'ps4', opts: { pro: true }, tema: 'azul', titulo: 'PlayStation 4 Pro', subtitulo: 'Foto de recepción', etiqueta: 'Recepción' },
  'demo-consola-switch-lite.jpg': { dibujo: 'switchlite', tema: 'turquesa', titulo: 'Nintendo Switch Lite', subtitulo: 'Foto de recepción', etiqueta: 'Recepción' },
  // fotos de procedimientos
  'demo-proc-ps5-desarme.jpg': { dibujo: 'placa', tema: 'verde', titulo: 'PS5 desarmada', subtitulo: 'Revisión de la placa principal', etiqueta: 'Procedimiento' },
  'demo-proc-ps5-hdmi.jpg': { dibujo: 'placa', opts: { hdmiMalo: true }, tema: 'rojo', titulo: 'Diagnóstico HDMI', subtitulo: 'Soldadura fracturada en el puerto', etiqueta: 'Procedimiento' },
  'demo-proc-ps5-limpieza.jpg': { split: [{ dibujo: 'ventilador', opts: { sucio: true }, txt: 'Antes', tono: '' }, { dibujo: 'ventilador', txt: 'Después' }], tema: 'azul', titulo: 'Limpieza del ventilador', subtitulo: 'PlayStation 5', etiqueta: 'Procedimiento' },
  'demo-proc-switch-joystick.jpg': { dibujo: 'joystick', tema: 'rojo', titulo: 'Joystick nuevo', subtitulo: 'Reemplazo en Joy-Con izquierdo', etiqueta: 'Procedimiento' },
  'demo-proc-ps4-pasta.jpg': { dibujo: 'placa', opts: { pasta: true }, tema: 'naranja', titulo: 'Pasta térmica nueva', subtitulo: 'PlayStation 4 Slim', etiqueta: 'Procedimiento' },
  'demo-proc-xbox-lector.jpg': { dibujo: 'lector', tema: 'verde', titulo: 'Lector óptico', subtitulo: 'Revisión del láser', etiqueta: 'Procedimiento' },
  'demo-proc-xbox-one-placa.jpg': { dibujo: 'placa', tema: 'gris', titulo: 'Placa Xbox One', subtitulo: 'Corto en la línea de la APU', etiqueta: 'Procedimiento' },
  // galería
  'demo-galeria-mantenimiento-ps4.jpg': { split: [{ dibujo: 'ventilador', opts: { sucio: true }, txt: 'Antes' }, { dibujo: 'ventilador', txt: 'Después' }], tema: 'azul', titulo: 'Mantenimiento PS4', subtitulo: 'Limpieza profunda y pasta térmica', etiqueta: 'Trabajos' },
  'demo-galeria-joystick-switch.jpg': { split: [{ dibujo: 'mando', opts: { c: '#00b4e6', drift: true }, txt: 'Drift' }, { dibujo: 'joystick', txt: 'Reparado' }], tema: 'rojo', titulo: 'Adiós al drift', subtitulo: 'Cambio de joystick analógico', etiqueta: 'Trabajos' },
  'demo-galeria-hdmi-ps5.jpg': { dibujo: 'placa', opts: { hdmiMalo: true }, tema: 'morado', titulo: 'Puerto HDMI PS5', subtitulo: 'Microsoldadura de precisión', etiqueta: 'Trabajos' },
  'demo-galeria-xbox-series-x.jpg': { dibujo: 'xboxx', tema: 'verde', titulo: 'Xbox Series X', subtitulo: 'Cambio de lector óptico', etiqueta: 'Trabajos' },
  'demo-galeria-ps5-entregada.jpg': { dibujo: 'ps5', tema: 'morado', titulo: 'PS5 lista para entregar', subtitulo: 'Probada durante 2 horas', etiqueta: 'Trabajos' },
  'demo-galeria-switch-lite.jpg': { dibujo: 'switchlite', opts: { c: '#f5c518' }, tema: 'turquesa', titulo: 'Switch Lite', subtitulo: 'Cambio de carcasa y joysticks', etiqueta: 'Trabajos' },
  'demo-galeria-taller.jpg': { dibujo: 'pasta', tema: 'naranja', titulo: 'Insumos de calidad', subtitulo: 'Pasta térmica de alto rendimiento', etiqueta: 'Trabajos' },
  // artículos
  'demo-art-dualsense.jpg': { dibujo: 'mando', opts: { ps: true }, tema: 'azul', titulo: 'Control DualSense', subtitulo: 'PlayStation 5' },
  'demo-art-control-xbox.jpg': { dibujo: 'mando', opts: { c: '#25272c' }, tema: 'verde', titulo: 'Control Xbox', subtitulo: 'Series X|S · One · PC' },
  'demo-art-joycon.jpg': { dibujo: 'joycons', tema: 'rojo', titulo: 'Joy-Con (par)', subtitulo: 'Neón azul / rojo' },
  'demo-art-hdmi.jpg': { dibujo: 'hdmi', tema: 'morado', titulo: 'Cable HDMI 2.1', subtitulo: '2 m · 4K 120 Hz' },
  'demo-art-cargador-switch.jpg': { dibujo: 'cargador', tema: 'rojo', titulo: 'Cargador USB-C', subtitulo: 'Nintendo Switch' },
  'demo-art-pasta.jpg': { dibujo: 'pasta', tema: 'naranja', titulo: 'Pasta térmica', subtitulo: 'Jeringa de 4 g' },
  'demo-art-joystick.jpg': { dibujo: 'joystick', tema: 'turquesa', titulo: 'Joystick analógico', subtitulo: 'Repuesto para Joy-Con' },
  'demo-art-ventilador-ps4.jpg': { dibujo: 'ventilador', tema: 'gris', titulo: 'Ventilador', subtitulo: 'PS4 Slim' },
  'demo-art-ps4-slim.jpg': { dibujo: 'ps4', tema: 'azul', titulo: 'PS4 Slim 500 GB', subtitulo: 'Reacondicionada' },
  'demo-art-switch-lite.jpg': { dibujo: 'switchlite', tema: 'turquesa', titulo: 'Switch Lite', subtitulo: 'Reacondicionada' },
  'demo-art-estuche-switch.jpg': { dibujo: 'estuche', tema: 'rojo', titulo: 'Estuche rígido', subtitulo: 'Nintendo Switch / OLED' },
  'demo-art-audifonos.jpg': { dibujo: 'audifonos', tema: 'morado', titulo: 'Audífonos gamer', subtitulo: 'Con micrófono' },
};

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
const solo = process.argv[3] ? new RegExp(process.argv[3]) : null;
for (const [nombre, cfg] of Object.entries(IMGS)) {
  if (solo && !solo.test(nombre)) continue;
  await page.setContent(html(cfg));
  await page.screenshot({ path: path.join(OUT, nombre), type: 'jpeg', quality: 82 });
}
if (!solo || solo.test('demo-logo.png')) {
  await page.setViewportSize({ width: 512, height: 512 });
  await page.setContent(logoHtml);
  await page.screenshot({ path: path.join(OUT, 'demo-logo.png'), omitBackground: true });
}
await browser.close();
for (const f of fs.readdirSync(OUT)) console.log(f, Math.round(fs.statSync(path.join(OUT, f)).size / 1024) + ' KB');
