# Archived Bootstrap custom theme variables

These two files (`_custom-variables.scss`, `_theme-variables.scss`) used to
live at `packages/web/src/scss/settings/` and were `@import`-ed into
`packages/web/src/scss/style.scss` **before** Bootstrap itself, overriding
~700 of Bootstrap's own `!default` variables (brand colors, spacing, etc.)
to give the app its custom look.

They were removed on 2026-08-25 as part of migrating the frontend's SCSS
from the deprecated `@import` syntax to `@use`/`@forward`. Sass's `@use`
requires variable overrides to be expressed as a `with (...)` configuration
map passed to the module being configured, rather than "declare a variable,
then `@import` the library" — and since neither of these files' ~700
variables were ever referenced anywhere else in the codebase (verified via
a full grep before deletion), converting them to a `with (...)` map would
have meant hand-translating all ~700 by hand for a purely cosmetic
deprecation-warning fix. The decision made instead: drop the customization
and let Bootstrap render with its stock defaults; Angular Material
components keep using their own independent, already-standard theme.

**Net effect:** anywhere the app still uses Bootstrap grid/utility/component
classes, the visual output changed from this custom brand palette to
Bootstrap 4's stock look.

## Restoring

If the custom Bootstrap branding needs to come back:

1. Move both files back to `packages/web/src/scss/settings/`.
2. In `packages/web/src/scss/style.scss`, replace the single
   `@use "bootstrap/scss/bootstrap";` line with:
   ```scss
   @use "bootstrap/scss/functions";
   @use "settings/custom-variables";
   @use "settings/theme-variables";
   @use "bootstrap/scss/variables";
   @use "bootstrap/scss/bootstrap";
   ```
   Note: restoring the override behavior under `@use` isn't a drop-in
   `@import`-style file order trick — Sass forward-config semantics differ,
   so this will likely need the variables re-expressed as a
   `@use "bootstrap/scss/bootstrap" with (...)` configuration map instead.
   Treat this as its own small migration, not a straight revert.
