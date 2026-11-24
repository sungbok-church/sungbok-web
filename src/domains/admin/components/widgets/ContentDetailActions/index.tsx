'use client';

import {
  duplicateBulletin,
  purgeBulletin,
  restoreBulletin,
  trashBulletin,
} from '@/domains/admin/api/actions/bulletinActions';
import {
  duplicateAlbum,
  purgeAlbum,
  restoreAlbum,
  trashAlbum,
} from '@/domains/admin/api/actions/albumActions';
import {
  duplicateResource,
  purgeResource,
  restoreResource,
  trashResource,
} from '@/domains/admin/api/actions/resourceActions';
import {
  duplicateNewsVideo,
  purgeNewsVideo,
  restoreNewsVideo,
  trashNewsVideo,
} from '@/domains/admin/api/actions/newsVideoActions';
import { NEWS_FEEDS, type NewsFeedKey } from '@/domains/admin/lib/newsFeed';
import { ConfirmAction } from '@/domains/admin/components/features/ConfirmAction';
import { HistorySheet } from '@/domains/admin/components/features/HistorySheet';
import { useAdminAction } from '@/domains/admin/hooks/useAdminAction';
import { useAdminNavigate } from '@/domains/admin/hooks/useAdminNavigate';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { Spinner } from '@/shared/components/ui/spinner';
import {
  CopyIcon,
  EllipsisIcon,
  HistoryIcon,
  RotateCcwIcon,
  Trash2Icon,
  TrashIcon,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';

type Id = { id: string };

/** 주일광고 · 성복의 뜰 — 한 표를 나눠 쓰므로 액션에 메뉴(feed)를 붙여 부른다 */
const newsKind = (feed: NewsFeedKey) => ({
  table: 'news_videos' as const,
  list: NEWS_FEEDS[feed].adminPath,
  duplicate: (a: Id) => duplicateNewsVideo({ ...a, feed }),
  trash: (a: Id) => trashNewsVideo({ ...a, feed }),
  restore: (a: Id) => restoreNewsVideo({ ...a, feed }),
  purge: (a: Id) => purgeNewsVideo({ ...a, feed }),
});

/** 콘텐츠 종류마다 표 · 목록 주소 · Server Action — 화면이 생길 때 더한다 */
const KINDS = {
  bulletin: {
    table: 'bulletins' as const,
    list: '/admin/bulletin',
    duplicate: duplicateBulletin,
    trash: trashBulletin,
    restore: restoreBulletin,
    purge: purgeBulletin,
  },
  album: {
    table: 'albums' as const,
    list: '/admin/album',
    duplicate: duplicateAlbum,
    trash: trashAlbum,
    restore: restoreAlbum,
    purge: purgeAlbum,
  },
  resources: {
    table: 'resources' as const,
    list: '/admin/resources',
    duplicate: duplicateResource,
    trash: trashResource,
    restore: restoreResource,
    purge: purgeResource,
  },
  announcements: newsKind('announcements'),
  garden: newsKind('garden'),
};

interface Props {
  kind: keyof typeof KINDS;
  id: string;
  /** 이력 창 제목에 쓰는 이름(«11월 29일 주보») */
  subject: string;
  trashed: boolean;
  /** 복제(등록 권한) */
  canCreate: boolean;
  /** 수정 권한 — 복제한 뒤 수정 화면으로 갈지(없으면 새 글의 상세로) */
  canUpdate: boolean;
  /** 휴지통 · 복구(삭제 권한) */
  canTrash: boolean;
  /** 완전 삭제 */
  canPurge: boolean;
  canHistory: boolean;
  /** 복제와 «더 보기» 사이에 둘 단추(사이트에서 보기 · 수정) */
  children?: ReactNode;
}

/**
 * 콘텐츠 상세 머리의 동작(설계 6.10 «콘텐츠 상세», 사용자 결정 2026-11-24) — [복제해서 새로 쓰기] 는 머리에(매주 지난 글을
 * 복제해 쓴다), 휴지통 보내기 · 변경 이력은 «더 보기» 에. 휴지통에 든 글이면 «더 보기» 에 복구 · 완전 삭제.
 * 복제하면 새 임시저장 글의 수정 화면으로 간다(수정 권한이 없으면 상세로). 확인 창 · 이력 창은 메뉴 밖에 둔다(메뉴는 고르면 닫히며 사라진다).
 */
export const ContentDetailActions = ({
  kind,
  id,
  subject,
  trashed,
  canCreate,
  canUpdate,
  canTrash,
  canPurge,
  canHistory,
  children,
}: Props) => {
  const k = KINDS[kind];
  const navigate = useAdminNavigate();
  const [dialog, setDialog] = useState<'trash' | 'purge' | 'history' | null>(null);
  const { pending, run } = useAdminAction();
  const openChange = (which: typeof dialog) => (open: boolean) => setDialog(open ? which : null);
  const restore = () => run(() => k.restore({ id }));

  const menuTrash = !trashed && canTrash;
  const menuRestore = trashed && canTrash;
  const menuPurge = trashed && canPurge;
  const hasMenu = menuTrash || menuRestore || menuPurge || canHistory;

  return (
    <>
      {canCreate && !trashed && (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            run(
              () => k.duplicate({ id }),
              result => {
                const copy = result.ok ? (result.data as { id: string } | undefined) : undefined;
                if (copy) navigate(`${k.list}/${copy.id}${canUpdate ? '/edit' : ''}`);
              }
            )
          }
        >
          {pending ? <Spinner data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />}
          복제해서 새로 쓰기
        </Button>
      )}

      {children}

      {hasMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="outline" size="icon" aria-label="더 보기" />}
          >
            <EllipsisIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-auto">
            {(menuTrash || menuRestore || menuPurge) && (
              <DropdownMenuGroup>
                {menuTrash && (
                  <DropdownMenuItem onClick={() => setDialog('trash')}>
                    <TrashIcon aria-hidden />
                    휴지통으로
                  </DropdownMenuItem>
                )}
                {menuRestore && (
                  <DropdownMenuItem disabled={pending} onClick={restore}>
                    <RotateCcwIcon aria-hidden />
                    복구
                  </DropdownMenuItem>
                )}
                {menuPurge && (
                  <DropdownMenuItem variant="destructive" onClick={() => setDialog('purge')}>
                    <Trash2Icon aria-hidden />
                    완전히 지우기
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            )}
            {(menuTrash || menuRestore || menuPurge) && canHistory && <DropdownMenuSeparator />}
            {canHistory && (
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => setDialog('history')}>
                  <HistoryIcon aria-hidden />
                  변경 이력
                </DropdownMenuItem>
              </DropdownMenuGroup>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {menuTrash && (
        <ConfirmAction
          kind="trash"
          open={dialog === 'trash'}
          onOpenChange={openChange('trash')}
          onConfirm={() => k.trash({ id })}
          undo={{ label: '되돌리기', onClick: restore }}
        />
      )}
      {menuPurge && (
        <ConfirmAction
          kind="purge"
          open={dialog === 'purge'}
          onOpenChange={openChange('purge')}
          onConfirm={async () => {
            const result = await k.purge({ id });
            if (result.ok) navigate(`${k.list}?trash=1`);
            return result;
          }}
        />
      )}
      {canHistory && (
        <HistorySheet
          table={k.table}
          rowId={id}
          subject={subject}
          open={dialog === 'history'}
          onOpenChange={openChange('history')}
        />
      )}
    </>
  );
};
