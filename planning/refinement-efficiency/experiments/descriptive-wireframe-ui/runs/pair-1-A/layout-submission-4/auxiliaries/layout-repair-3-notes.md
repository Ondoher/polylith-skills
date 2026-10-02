# Pair 1 A structural repair 3

The persistent project header now exposes New, Open, Save Project and Save As beside the unchanged project identity, with the frozen `new-project`, `open-project`, `save-project` and `save-project-as` action bindings. Workspace ordering and the independent video name/Save Video row are unchanged. The existing 14 scenes and accepted timeline, player and rectangle geometry remain intact.

During Save Video commit, all four persistent project actions are disabled along with the already frozen editor, navigation and frame-step controls. In the Open project-decision guard, the underlying project-header actions are disabled while the dialog keeps Retry Save Project, Discard Project Changes and Cancel Open available. The visible Open header affordance now identifies the guard's originating command without implying a second Open while the decision is pending.

The final `layout-r16` capture contains all 14 scenes. All four pages were inspected for header reachability and the busy/guard availability. Exact header text fit and styling continue to the UI author; this repair introduces no new source policy or scenario.
