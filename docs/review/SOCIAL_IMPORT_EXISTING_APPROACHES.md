# Existing recipe-import approaches: private social content

Checked 2026-11-08 against product owners' own documentation, not advertising claims or anonymous workarounds.

| Product/source | Documented behavior | Implication for KETO |
| --- | --- | --- |
| ReciMe Help | Only public content can be imported; private accounts/login/subscription content cannot be fetched. Suggests screenshot import. | A paid subscription to a private creator does not grant an application a universal private-feed API. |
| CookBook | Social links/captions and screenshot/photo recipe scanner. Private/removed/incomplete social posts may not import. | Preserve source URL and actual supplied image/text separately; URL alone must stay unread. |
| Paprika iOS | Built-in browser, clipboard URL detection, explicit recipe download/manual clipping. | User-directed browser clipping is an existing pattern, but the KETO web page cannot inherit Instagram cookies or read another origin. No such browser connector is deployed here. |
| Telegram official Bot FAQ | Bot reads only messages delivered according to its participation/admin/privacy permissions; direct messages must be initiated by the user. | A deliberately forwarded recipe or an explicitly authorized group bot is possible future work. Do not imply an unrelated bot inherits a user's membership in every private group. |

Current implementation strengthens intentional image paste/drop/upload and controlled public direct-image loading. It does not install Instagram/Telegram account access, copy cookies/passwords, bypass protected content, or bulk-import a private paid library. Text/image imports remain personal and untrusted until reviewed and calculated. For restricted sources, use only content the user is permitted to provide; don't claim permission to republish it globally.

## Primary references

- https://www.recime.app/help/en/articles/14773584-why-didn-t-my-recipe-import-correctly
- https://cookbookmanager.com/features/add-import-and-create-recipes
- https://web.cookbookmanager.com/post/how-to-save-recipes-from-instagram
- https://www.paprikaapp.com/help/ipad/
- https://core.telegram.org/bots/faq
- https://core.telegram.org/bots

No third-party service was installed, paid for or given family data in this research.
