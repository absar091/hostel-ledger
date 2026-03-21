## 2024-05-18 - Missing label association in reporting form
**Learning:** Found `<label>` elements missing `htmlFor` properties on the Report sheet, breaking screen reader association with `<select>` and `<textarea>`.
**Action:** Always ensure any `<label>` has a matching `htmlFor` pointing to the form field's `id`.
