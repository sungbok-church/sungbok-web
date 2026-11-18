'use client';

import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/shared/components/ui/empty';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/shared/components/ui/field';
import { ImageDropzone, type DropzoneImage } from '@/shared/components/ui/image-dropzone';
import { Input } from '@/shared/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import { ResponsiveList } from '@/shared/components/ui/responsive-list';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/components/ui/sheet';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Switch } from '@/shared/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Textarea } from '@/shared/components/ui/textarea';
import { contrastRatio } from '@/shared/lib/contrast';
import { useState, type ReactNode } from 'react';

// 값은 globals.css 와 같아야 한다 — tests/design/tokens.test.ts 가 globals.css 쪽을 잠근다.
const COLORS = [
  ['b1-bg', '#f6fafe'],
  ['b1-surface', '#ffffff'],
  ['b1-text', '#0f172a'],
  ['b1-sub', '#3f526b'],
  ['b1-muted', '#8fa0b8'],
  ['b1-border', '#dce5f0'],
  ['b1-accent', '#2563eb'],
  ['b1-accent2', '#5b7fe0'],
  ['b1-accent-soft', '#e8f0fe'],
  ['b1-glow', '#d2ebff'],
  ['b1-sunday', '#dc2626'],
  ['b1-placeholder', '#ecf0f7'],
  ['b1-placeholder-tone', '#c2cddc'],
  ['b1-success', '#15803d'],
  ['b1-warning', '#b45309'],
  ['b1-danger', '#c81e1e'],
] as const;

const TYPE_SCALE = [
  ['text-display', '삶에 기쁨과 소망을 주는 교회'],
  ['text-h1', '섬기는 이들'],
  ['text-h2', '이번 주 예배'],
  ['text-h3', '주일예배 순서'],
  ['text-title', '11월 9일 주일 광고'],
  ['text-body', '성복교회는 대한예수교장로회 합동교단에 소속되어 있습니다.'],
  ['text-body-sm', '보조 본문과 표 안의 글자 크기입니다.'],
  ['text-label', '버튼 · 탭 · 배지'],
  ['text-caption', '2026. 11. 09 · 예루살렘성전 3F'],
  ['text-eyebrow', '● WORSHIP'],
] as const;

// Base UI 의 Select 에 넘기는 항목 — 값이 null 인 첫 항목이 «고르기 전» 에 보이는 문구다
const DEPARTMENT_ITEMS: { label: string; value: string | null }[] = [
  { label: '부서 선택', value: null },
  ...['영아부', '유치부', '유년부', '초등부', '중등부', '고등부', '청년부', '영어예배부'].map(
    d => ({
      label: d,
      value: d,
    })
  ),
];

const BULLETINS = [
  { id: '1', title: '2026년 11월 9일 주보', date: '2026-11-07', status: '공개' },
  {
    id: '2',
    title: '2026년 11월 2일 주보 — 추수감사주일 특별 순서 포함',
    date: '2026-10-31',
    status: '공개',
  },
  { id: '3', title: '2026년 11월 16일 주보', date: '—', status: '임시 저장' },
];

const Section = ({ id, title, children }: { id: string; title: string; children: ReactNode }) => (
  <section id={id} className="border-b1-border flex flex-col gap-6 border-t py-12">
    <h2 className="text-h2 m-0">{title}</h2>
    {children}
  </section>
);

const Code = ({ children }: { children: ReactNode }) => (
  <code className="text-caption text-b1-sub font-mono">{children}</code>
);

export const DesignShowcase = () => {
  const [images, setImages] = useState<DropzoneImage[]>([]);

  return (
    <div className="mx-auto max-w-[1100px] px-6 pt-28 pb-24">
      <p className="text-eyebrow text-b1-accent m-0">● DESIGN SYSTEM</p>
      <h1 className="text-h1 mt-3 mb-2">디자인 견본</h1>
      <p className="text-body text-b1-sub m-0">
        개발 서버에서만 열립니다. 기준 문서: <Code>.md/design/design-system.md</Code>
      </p>

      <Section id="color" title="색">
        <ul className="m-0 grid list-none grid-cols-2 gap-4 p-0 sm:grid-cols-3 lg:grid-cols-4">
          {COLORS.map(([name, hex]) => (
            <li key={name} className="border-b1-border overflow-hidden rounded-xl border">
              <div className="h-16" style={{ background: hex }} />
              <div className="flex flex-col gap-1 p-3">
                <span className="text-label">{name}</span>
                <Code>{hex}</Code>
                <span className="text-caption text-b1-sub">
                  흰 배경 {contrastRatio(hex, '#ffffff').toFixed(1)}:1 · bg{' '}
                  {contrastRatio(hex, '#f6fafe').toFixed(1)}:1
                </span>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="type" title="글자 크기">
        <ul className="m-0 flex list-none flex-col gap-5 p-0">
          {TYPE_SCALE.map(([cls, sample]) => (
            <li key={cls} className="flex flex-col gap-1">
              <Code>{cls}</Code>
              <span className={cls}>{sample}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="surface" title="그림자 · 둥글기 · 모션">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {(['shadow-sm', 'shadow-md', 'shadow-lg'] as const).map(s => (
            <div key={s} className={`bg-b1-surface rounded-2xl p-6 ${s}`}>
              <Code>{s}</Code>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          {(['duration-fast', 'duration-base', 'duration-slow'] as const).map(d => (
            <Button key={d} variant="outline" className={`${d} ease-standard`}>
              hover {d}
            </Button>
          ))}
        </div>
      </Section>

      <Section id="buttons" title="버튼 · 배지">
        <div className="flex flex-wrap items-center gap-3">
          <Button>저장</Button>
          <Button variant="secondary">미리 보기</Button>
          <Button variant="outline">취소</Button>
          <Button variant="ghost">더 보기</Button>
          <Button variant="destructive">삭제</Button>
          <Button variant="link">자세히</Button>
          <Button disabled>저장 중</Button>
          <Button size="lg">주보 올리기</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge>임시 저장</Badge>
          <Badge variant="accent">공개</Badge>
          <Badge variant="success">저장 완료</Badge>
          <Badge variant="warning">기간 만료 임박</Badge>
          <Badge variant="danger">업로드 실패</Badge>
          <Badge variant="accent">금요 생수의 강·월삭예배 특별 순서 안내</Badge>
        </div>
        <Button className="w-full sm:w-auto">가정·명절·절기 설교 시트지 전체 내려받기</Button>
      </Section>

      <Section id="tabs" title="탭 (긴 라벨)">
        <Tabs defaultValue="sunday">
          <TabsList>
            <TabsTrigger value="sunday">주일 설교 시트지</TabsTrigger>
            <TabsTrigger value="series">시리즈 설교 시트지</TabsTrigger>
            <TabsTrigger value="seasonal">가정·명절·절기 설교 시트지</TabsTrigger>
            <TabsTrigger value="friday">금요 생수의 강·월삭예배</TabsTrigger>
          </TabsList>
          <TabsContent value="sunday">
            <p className="text-muted-foreground pt-4">
              화살표 키로 탭을 옮기고 Enter 나 Space 로 고릅니다(Base UI 기본 동작).
            </p>
          </TabsContent>
        </Tabs>
      </Section>

      <Section id="form" title="입력">
        {/* 폼의 틀은 FieldGroup + Field(.claude/skills/shadcn/rules/forms.md) */}
        <FieldGroup className="max-w-xl">
          <Field>
            <FieldLabel htmlFor="d-title">제목</FieldLabel>
            <Input id="d-title" placeholder="2026년 11월 9일 주보" required />
            <FieldDescription>주보 목록에 보이는 이름입니다</FieldDescription>
          </Field>
          <Field data-invalid>
            <FieldLabel htmlFor="d-dept">부서</FieldLabel>
            {/* Base UI 의 Select 는 items 를 받는다 — 값이 null 인 항목이 «고르기 전» 문구다 */}
            <Select items={DEPARTMENT_ITEMS}>
              <SelectTrigger id="d-dept" className="w-full" aria-invalid>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {DEPARTMENT_ITEMS.map(item => (
                    <SelectItem key={item.label} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldError>부서를 골라 주세요</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="d-body">광고 본문</FieldLabel>
            <Textarea id="d-body" rows={4} placeholder="■ 예배와 소식" />
          </Field>
          <Field orientation="horizontal">
            <Checkbox id="d-home" />
            <FieldLabel htmlFor="d-home" className="font-normal">
              홈 화면에 함께 보이기
            </FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <Switch id="d-urgent" />
            <FieldLabel htmlFor="d-urgent" className="font-normal">
              긴급 공지 띠 켜기
            </FieldLabel>
          </Field>
          <FieldSet>
            <FieldLegend variant="label">공개 시점</FieldLegend>
            <RadioGroup defaultValue="now">
              <Field orientation="horizontal">
                <RadioGroupItem id="d-now" value="now" />
                <FieldLabel htmlFor="d-now" className="font-normal">
                  바로 공개
                </FieldLabel>
              </Field>
              <Field orientation="horizontal">
                <RadioGroupItem id="d-later" value="later" />
                <FieldLabel htmlFor="d-later" className="font-normal">
                  예약 공개
                </FieldLabel>
              </Field>
            </RadioGroup>
          </FieldSet>
        </FieldGroup>
      </Section>

      <Section id="overlay" title="겹침">
        <div className="flex flex-wrap gap-3">
          <Dialog>
            <DialogTrigger render={<Button variant="outline" />}>대화상자 열기</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>주보를 삭제할까요?</DialogTitle>
                <DialogDescription>삭제한 주보는 되돌릴 수 없습니다.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline">취소</Button>
                <Button variant="destructive">삭제</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Sheet>
            <SheetTrigger render={<Button variant="outline" />}>시트 열기 (아래)</SheetTrigger>
            <SheetContent side="bottom">
              <SheetHeader>
                <SheetTitle>사진 정렬</SheetTitle>
                <SheetDescription>휴대폰에서는 아래에서 올라오는 시트를 씁니다.</SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" />}>메뉴</DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuGroup>
                <DropdownMenuItem>수정</DropdownMenuItem>
                <DropdownMenuItem>복제</DropdownMenuItem>
                <DropdownMenuItem variant="destructive">삭제</DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Section>

      <Section id="list" title="목록 (PC 표 · 휴대폰 카드)">
        <ResponsiveList
          items={BULLETINS}
          getKey={b => b.id}
          columns={[
            { key: 'title', header: '제목', cell: b => b.title },
            { key: 'date', header: '올린 날', cell: b => b.date },
            {
              key: 'status',
              header: '상태',
              cell: b => (
                <Badge variant={b.status === '공개' ? 'accent' : 'neutral'}>{b.status}</Badge>
              ),
            },
          ]}
          card={b => (
            <div className="border-b1-border bg-b1-surface flex flex-col gap-2 rounded-xl border p-4">
              <span className="text-title">{b.title}</span>
              <span className="text-caption text-b1-sub">{b.date}</span>
              <Badge variant={b.status === '공개' ? 'accent' : 'neutral'}>{b.status}</Badge>
            </div>
          )}
        />
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>아직 올린 앨범이 없습니다</EmptyTitle>
            <EmptyDescription>행사 사진을 묶어 앨범으로 올릴 수 있습니다.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button>앨범 만들기</Button>
          </EmptyContent>
        </Empty>
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>이진</AvatarFallback>
          </Avatar>
          <Skeleton className="h-4 w-40" />
        </div>
      </Section>

      <Section id="upload" title="사진 올리기 (UI만)">
        <ImageDropzone
          value={images}
          onChange={setImages}
          max={8}
          onAddFiles={files =>
            setImages(prev => [
              ...prev,
              ...files.map(f => ({
                id: `${f.name}-${f.lastModified}`,
                previewUrl: URL.createObjectURL(f),
              })),
            ])
          }
        />
      </Section>

      <Section id="responsive" title="반응형 기준">
        <ul className="text-body text-b1-sub m-0 flex flex-col gap-2 pl-5">
          <li>
            확인 폭 375 · 768 · 1280 (헤더는 1024도) — <Code>pnpm design:audit</Code>
          </li>
          <li>터치 영역 44×44px 이상 (1024 미만 폭)</li>
          <li>한글 13px · 본문 16px · 입력칸 16px 이상</li>
          <li>가로 넘침 0</li>
        </ul>
      </Section>
    </div>
  );
};
