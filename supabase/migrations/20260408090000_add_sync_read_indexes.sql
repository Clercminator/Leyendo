create index if not exists user_documents_user_updated_at_idx
on public.user_documents (user_id, updated_at desc);

create index if not exists user_sessions_user_updated_at_idx
on public.user_sessions (user_id, updated_at desc);

create index if not exists user_bookmarks_user_created_at_idx
on public.user_bookmarks (user_id, created_at desc);

create index if not exists user_bookmarks_user_document_idx
on public.user_bookmarks (user_id, document_id);

create index if not exists user_highlights_user_created_at_idx
on public.user_highlights (user_id, created_at desc);

create index if not exists user_highlights_user_document_idx
on public.user_highlights (user_id, document_id);