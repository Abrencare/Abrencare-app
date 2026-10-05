# chat/pagination.py

from rest_framework.pagination import CursorPagination


class MessageCursorPagination(CursorPagination):
    # Cursor pagination requires a unique, monotonic ordering field.
    # `created_at` alone can collide; `id` is monotonic per insert.
    ordering = "created_at"
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200