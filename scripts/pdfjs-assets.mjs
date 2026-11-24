// node scripts/pdfjs-assets.mjs — PDF.js 의 worker 와 한글 PDF 를 그릴 때 받는 자료(CMap · 기본 글꼴 · wasm)를 public/pdfjs/<버전>/ 으로 복사한다.
// 관리자 설교 시트지 등록 화면이 PDF 의 쪽 그림을 만들 때 쓴다(CMap 이 없으면 한글 글자가 빠진 채 그려진다 — 2026-11-24 확인).
// 같은 출처에서 받아야 관리자 CSP(connect-src 'self')를 지난다. 버전을 주소에 넣어 라이브러리와 늘 맞춘다(옛 버전 폴더는 지운다).
// 복사본은 git 에 넣지 않는다(.gitignore) — dev · build 가 먼저 돌린다.
import { cpSync, existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const pkg = `${root}node_modules/pdfjs-dist`;
const { version } = JSON.parse(readFileSync(`${pkg}/package.json`, 'utf8'));
const outRoot = `${root}public/pdfjs`;
const out = `${outRoot}/${version}`;

if (existsSync(outRoot))
  for (const dir of readdirSync(outRoot))
    if (dir !== version) rmSync(`${outRoot}/${dir}`, { recursive: true });
// 세 폴더 + worker 가 다 있어야 한다 — 복사가 중간에 끊겼으면 다시 채운다
const parts = ['cmaps', 'standard_fonts', 'wasm', 'pdf.worker.min.mjs'];
if (!parts.every(p => existsSync(`${out}/${p}`))) {
  for (const dir of ['cmaps', 'standard_fonts', 'wasm'])
    cpSync(`${pkg}/${dir}`, `${out}/${dir}`, { recursive: true });
  cpSync(`${pkg}/build/pdf.worker.min.mjs`, `${out}/pdf.worker.min.mjs`);
  console.log(`pdfjs-assets: public/pdfjs/${version} 를 만들었습니다.`);
}
