-- 유튜브 동기화(묶음 E) — 받아 둔 영상은 누구나 읽고, 쓰기 · 동기화 함수는 서버 전용 키만. 한 페이지를 동시에 받지 않고(claim),
-- 받은 재생목록 전체로 줄을 바꾼다(replace — 빠진 영상은 지운다). `pnpm db:test`. 모든 변경은 끝에서 되돌린다.
begin;
select * from no_plan();

-- 권한
select ok(has_table_privilege('anon', 'public.youtube_videos', 'select'), '방문자는 받아 둔 영상을 읽는다');
select ok(not has_table_privilege('anon', 'public.youtube_videos', 'insert'), '방문자는 넣지 못한다');
select ok(not has_table_privilege('authenticated', 'public.youtube_videos', 'insert'), '로그인 사용자도 넣지 못한다');
select ok(not has_table_privilege('authenticated', 'public.youtube_videos', 'delete'), '로그인 사용자도 지우지 못한다');
select ok(not has_table_privilege('anon', 'public.youtube_sync', 'select'), '동기화 기록은 방문자가 읽지 못한다');
select ok(
  not has_function_privilege('anon', 'public.replace_youtube_videos(text, jsonb)', 'execute')
    and not has_function_privilege('authenticated', 'public.replace_youtube_videos(text, jsonb)', 'execute')
    and has_function_privilege('service_role', 'public.replace_youtube_videos(text, jsonb)', 'execute'),
  '줄 바꾸기는 서버 전용 키만'
);
select ok(
  not has_function_privilege('anon', 'public.claim_youtube_sync(text, interval)', 'execute')
    and not has_function_privilege('authenticated', 'public.claim_youtube_sync(text, interval)', 'execute')
    and has_function_privilege('service_role', 'public.claim_youtube_sync(text, interval)', 'execute'),
  '받기 차례 잡기는 서버 전용 키만'
);

-- 차례 잡기 — 처음은 된다, 받는 중이면 안 된다
select ok(public.claim_youtube_sync('t-page', interval '10 minutes'), '처음 받는 페이지는 받는다');
select ok(not public.claim_youtube_sync('t-page', interval '10 minutes'), '다른 곳이 받는 중이면(2분) 받지 않는다');

-- 줄 바꾸기
select is(
  public.replace_youtube_videos('t-page', '[
    {"video_id": "aaaaaaaaaaa", "position": 0, "title": "첫 영상", "description": "설명", "published_at": "2026-11-22T01:00:00Z",
     "added_at": "2026-11-22T02:00:00Z", "thumbnail": "https://i.ytimg.com/a.jpg", "poster": "https://i.ytimg.com/a-max.jpg"},
    {"video_id": "bbbbbbbbbbb", "position": 1, "title": "둘째 영상", "thumbnail": "https://i.ytimg.com/b.jpg",
     "poster": "https://i.ytimg.com/b.jpg"}
  ]'::jsonb),
  2,
  '받은 재생목록을 넣는다'
);
select is(
  (select description from public.youtube_videos where page = 't-page' and video_id = 'bbbbbbbbbbb'),
  '',
  '설명이 없으면 빈 글자'
);
select ok(not public.claim_youtube_sync('t-page', interval '10 minutes'), '방금 받았으면 10분 안에는 다시 받지 않는다');
select ok(public.claim_youtube_sync('t-page', interval '0'), '예약 작업(간격 0)은 바로 받는다');

select public.replace_youtube_videos('t-page', '[
  {"video_id": "bbbbbbbbbbb", "position": 0, "title": "둘째 영상(고침)", "thumbnail": "https://i.ytimg.com/b.jpg",
   "poster": "https://i.ytimg.com/b.jpg"}
]'::jsonb);
select is(
  (select array_agg(video_id || ':' || title || ':' || position order by position) from public.youtube_videos where page = 't-page'),
  array['bbbbbbbbbbb:둘째 영상(고침):0'],
  '재생목록에서 빠진 영상은 지우고, 남은 영상은 유튜브 값으로 고친다'
);

select throws_ok(
  $$select public.replace_youtube_videos('t-page', '[{"video_id": "짧음", "position": 0, "title": "x", "thumbnail": "t", "poster": "p"}]'::jsonb)$$,
  '23514', null, '영상 id 모양이 아니면 넣지 않는다'
);

-- 방문자로 읽기
set local role anon;
select is((select count(*)::int from public.youtube_videos where page = 't-page'), 1, '방문자가 받아 둔 영상을 읽는다');
reset role;

select * from finish();
rollback;
