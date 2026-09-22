# A smaller Sunset Duckies website

Implemented 21 September 2026. Scope: public and member experiences; admin workflows excluded.

The site should answer three questions: What is this club? What have the kids been up to? What does my family need?

## The structure

| Area | Main navigation | What belongs here |
| --- | --- | --- |
| Public | Home · Blog · Club | Introduction, joining, practical information, public stories; Club opens sign-in or the member area. |
| Members | Club · Photos · Family | Surf information and updates; photos and sharing; children, records and occasional account tasks. |

On phones, the member destinations are labelled bottom tabs. There is no account dropdown or separate Share tab. The logo leads back to the public website. Existing URLs continue to work, including the old photo-directory entrance. Archived members get Memories and Family/Account according to their existing access.

## Feature and function review

| Feature / routes | Decision and implementation |
| --- | --- |
| Homepage `/` | Replace the long sequence of repeated pitches with an introduction, joining and safety essentials, weekly sessions and Cup links, two recent blog stories, and sponsors. Remove the expired kickoff promotion and the old “next up” Cup claim. Keep a single main joining action. |
| Joining `/join` | Keep as a contextual link after the introductory WhatsApp conversation. It is no longer one of many competing homepage buttons. |
| Registration `/register` | Keep the private-link form, multiple children, emergency contacts, medical information, consent, guardian signatures, corrections and signed downloads. These collect information the club needs; removing them would not be a navigation simplification. |
| Sign-in `/login` | Keep passwordless email codes. One consistent public Club entrance; session lookup failure still leaves a working `/account` link. |
| Account dashboard `/account` | Remove the redundant dashboard. Route straight to Club, Memories, Family or account details according to access. |
| Blog `/blog`, `/blog/[slug]` | Keep as the single public home for stories and recaps. Promote the two latest stories on Home. |
| Training `/training-materials` | Keep videos, exercises and playlists as Surf tips from Club and a contextual homepage link. Remove from global navigation. |
| Cup editions `/sunset-duckies-cup`, `/sunset-duckies-cup-vol-2` | Keep event details and registration. Link from Home and Club; previous edition remains a contextual link. Remove the permanent edition dropdown. |
| Live Cup `/sunset-duckies-cup-vol-2/live` | Keep heats and leaderboard linked from the event page. This is an event-specific activity. |
| Judging `/cup/judge` | Keep scoring and volunteering reached from the live event board. Remove from the general account navigation. |
| Club home `/members` | Put the weekly surf rhythm and WhatsApp surf-call link first, then the upcoming Cup when applicable and club updates. Stop loading the full directory and gallery/tag collection on this landing screen. |
| Posts, reactions and comments `/members/posts/[id]` | Keep the feed and discussions. Collapse the composer behind Share a moment so reading is the default. Text and one-photo posts remain available. |
| Member directory `/members/lineup` | Consolidate parents and children in one searchable directory reached through Meet the crew or Find a duckie. Remove the directory from the top of Club. |
| Parent profiles `/members/people/[id]` | Keep contextual profiles from the directory and post author links, without a navigation item per profile type. |
| Photo library `/gallery` | Promote to the Photos tab. Replace nine album links with one native album selector. Keep tagging, full-size viewing, videos and access controls. |
| Photo uploads `/gallery/share` | Keep bulk uploads, captions, child tagging and permission confirmation as the Share photos action inside Photos, with an explicit return link. Remove Share from the primary tabs. |
| Duckie albums `/gallery/duckies/[id]` | Keep as contextual child albums. The old directory URL `/gallery/duckies` opens the shared crew directory. |
| Own photos and posts `/members/me` | Reach through Our photos & moments inside Photos or Family. Keep personal uploads, family-tagged photos, own posts and public-link management. Remove unrelated Orders/Family links from the in-page tabs. |
| Public shares `/s/[token]` | Keep deliberate public sharing and revocation. Shared links are separate from access to the private gallery. No global menu item. |
| Departed-member archive | Keep the read-only personal archive and its access rules; its two navigation destinations do not advertise active-member features. |
| Family `/members/profile` | One home for children, guardians, fee status, forms, corrections, portraits, attendance/points and membership reference information. Existing detail panels keep occasional work out of the default view. |
| Personal details `/account/profile` | Keep as an edit page reached from Family. It is no longer a competing top-level profile destination. Sign-out remains reachable here and on Family. |
| Orders `/account/orders`, `/orders/[id]` | Move discovery into Family. Keep shared family orders, reservation status and token-based guest access. Signed-in order pages retain the member navigation. |
| Shop `/shop`, `/shop/[slug]` | Move discovery into Family. Keep products, packs, reservations, collection and points benefits. Eligible members retain the member shell through the purchase flow; public visitors retain the existing teaser. |
| Branding `/branding-plan/**`, `/product-ideas`, brand templates | Remove from public navigation and footer. Planning, board, marketing, business case, granola tools, deliverables and approvals remain in their existing restricted project workspace via its URL. They do not belong in a surf-family menu. |
| Theme and account controls | Keep theme switching on member headers/sidebar and the public footer. Move sign-out to Family/account details. Keep the admin entry available to organisers there; admin workflows remain intact. |

## Mobile decisions

- Public header fits in one row, including at 320px.
- Three member destinations with text labels, active states and at least 48px-high bottom-tab targets.
- Bottom safe-area padding and scroll clearance prevent the tab bar from covering the end of a page.
- Native album selector replaces a wall of small photo-section buttons.
- Member text fields use 16px text on phones to avoid focus zoom.
- A visible-on-focus skip link, keyboard focus indicators and a focusable destination for album jumps.
- Static homepage photography removes the looping hero and moving ticker from the public entry flow.

Guideline reference: [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md). This review prioritised navigation, touch targets, focus and safe areas; it is not a claim that every existing widget has passed a complete accessibility audit.

## Product boundaries

This change reduces the decisions shown on each screen. It does not delete family records, change membership policy, alter consent, or remove working event, shop or archive functionality. WhatsApp remains the source for current surf calls; the weekly timetable is not presented as a confirmed live session.

The branding workspace remains a separate project rather than being repackaged as a member feature. Its collaborators can continue to use `/branding-plan` directly.

## Verification

- `pnpm check`: passed, no errors or warnings; six informational hints remain.
- `pnpm build`: passed, including server functions and public prerendering.
- 56 Playwright checks passed across navigation, membership, family profiles, guardians, photos, social posts, archives, public sharing and the shop, using the dedicated local `duckies_test_ux` database.
- After the final photo-layout and wording refinements, all three navigation checks passed again, including album selection/focus and the personal-photo entrance.
- Inspected phone screenshots; checked the public header at 320px, 390px and 1440px and member tabs at 320px/390px. Existing photo/profile checks also cover desktop/tablet layouts and dark mode.
- `git diff --check`: passed. No production deployment or production database changes.
