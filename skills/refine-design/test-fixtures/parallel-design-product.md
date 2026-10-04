# Draft Desk — synthetic design evaluation

Draft Desk is a desktop tool for one person who maintains up to twelve named
text drafts. This is an unrelated synthetic product for evaluating planning and
design coordination. It is not an application requirement or a selected framework.

The user can choose one draft from a shared named-draft chooser. The chooser
shows which draft is current and remains available in both workflows.

The confirmation workflow lets the user inspect the chosen draft and mark it
ready without changing its title or text. Show the resulting ready status on
that same draft after confirmation succeeds. If confirmation fails, keep the
same draft visible and allow retry. Do not imply readiness before success.

The revision workflow lets the user edit the chosen draft's title and text,
then save the changes. An empty title prevents saving and identifies the title
problem. A successful save keeps the saved values visible. A failed save retains
the edited values for retry. The user can cancel revision to return to the
previous saved values. Choosing another draft while edits are unsaved requires
an explicit keep-editing or discard choice; do not silently lose the draft.

While either operation is pending, retain the user's context and prevent a
duplicate submission. Both workflows must have usable keyboard navigation,
visible focus, meaningful control names and clear pending, failed and completed
states. Users must distinguish the current selection, an unsaved edit and a
successfully confirmed or saved draft.

The product makes no claim about storage architecture, multi-user collaboration,
network transport, mobile layouts or bulk operations. Scope those out rather
than selecting implementation policies or adding optional product features.
