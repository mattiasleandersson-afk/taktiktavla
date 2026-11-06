/* File-list metadata edits. Rename only saves.name; never upload canvas state. */
(function () {
  'use strict';
  const type = kind => kind === 'board' ? 'uppstallning' : kind === 'film' ? 'taktikfilm' : 'match';
  const id = (kind,item) => kind === 'board' ? item.id : item.dbId;
  const title = (kind,item) => item.name || (kind === 'match' ? [item.datum,item.motstand].filter(Boolean).join(' ') : 'Namnlös');
  function allowed(kind,item) {
    if (!window.tt301GetAccessState?.()?.allowed) return false;
    if (kind === 'match') return !!window.tt301GetAccessState()?.isAdmin;
    return !item._readOnly && !item._openedFromTeam && typeof isMineV10 === 'function' && isMineV10(item);
  }
  function collection(kind) { return kind === 'board' ? savedFormations : kind === 'film' ? taktikFilmer : matcher; }
  function refresh(kind) {
    if (kind === 'board') { renderSavesList(); updateSaveButtons(); }
    else if (kind === 'film') renderTaktikList();
    else { renderSparadeMatcherList(); renderMatchHistory(); }
  }
  function duplicate(kind,item,name) {
    if (kind === 'match') return false;
    return collection(kind).some(other => other !== item && (id(kind,item) == null || String(id(kind,other)) !== String(id(kind,item))) &&
      isMineV10(other) && title(kind,other).trim().toLocaleLowerCase('sv') === name.toLocaleLowerCase('sv') &&
      (kind === 'film' || (other.folder || 'Allmänt') === (item.folder || 'Allmänt')));
  }
  let dialog, current, busy = false;
  function installStyle() {
    const css = document.createElement('style');
    css.textContent = '.tt-file-rename{flex:0 0 auto;min-width:28px;min-height:28px!important;padding:3px 6px!important;color:#e8c84a!important;touch-action:manipulation}.tt-match-file-title{flex-basis:100%;font-weight:700;overflow-wrap:anywhere}#tt-file-name-dialog{margin:auto;box-sizing:border-box;width:min(420px,calc(100vw - 24px));border:1px solid #42694c;border-radius:12px;background:#101c14;color:#edf5ee;padding:18px;max-height:90dvh;overflow:auto}#tt-file-name-dialog::backdrop{background:#0009}#tt-file-name-dialog form{display:flex;flex-direction:column;gap:12px}#tt-file-name-dialog input{box-sizing:border-box;width:100%;font:16px Arial;padding:10px;color:#edf5ee;background:#17271c;border:1px solid #42694c;border-radius:6px}#tt-file-name-dialog .tt-name-actions{display:flex;justify-content:flex-end;gap:8px}#tt-file-name-dialog .tt-name-actions button{min-height:40px}#tt-file-name-dialog h2{font-size:18px;margin:0}#tt-file-name-dialog [role=alert]{color:#ffb58c;line-height:1.4}';
    document.head.appendChild(css);
  }
  installStyle();
  function ensureDialog() {
    if (dialog) return;
    dialog = document.createElement('dialog'); dialog.id = 'tt-file-name-dialog'; dialog.setAttribute('aria-labelledby','tt-file-name-heading');
    dialog.innerHTML = '<form><h2 id="tt-file-name-heading">Byt filnamn</h2><label>Namn<input id="tt-file-name-input" required maxlength="200" autocomplete="off"></label><div role="alert"></div><div class="tt-name-actions"><button type="button" class="btn" id="tt-file-name-cancel">Avbryt</button><button type="submit" class="btn" id="tt-file-name-save">Spara namn</button></div></form>';
    document.body.appendChild(dialog);
    dialog.querySelector('#tt-file-name-cancel').onclick = () => { if (!busy) dialog.close(); };
    dialog.addEventListener('cancel',e => { if (busy) e.preventDefault(); });
    dialog.querySelector('form').addEventListener('submit', async e => {
      e.preventDefault(); if (busy || !current) return;
      const {kind,item} = current, name = dialog.querySelector('input').value.trim();
      const error = dialog.querySelector('[role=alert]'); error.textContent = '';
      if (!name) { error.textContent = 'Skriv ett namn.'; return; }
      if (!allowed(kind,item)) { error.textContent = 'Filen är skrivskyddad.'; return; }
      if (name === title(kind,item)) { dialog.close(); return; }
      if (duplicate(kind,item,name)) { error.textContent = 'Du har redan en fil med det namnet. Välj ett annat namn.'; return; }
      busy = true; dialog.querySelectorAll('input,button').forEach(el => el.disabled = true);
      try {
        const fileId = id(kind,item);
        if (fileId != null) {
          const params = new URLSearchParams({id:'eq.'+fileId,type:'eq.'+type(kind)});
          const url = SUPA_URL + '/rest/v1/' + SUPA_TABLE + '?' + params;
          const response = await fetch(url,{headers:supaHeaders()});
          if (!response.ok) throw new Error('Kunde inte läsa filen. Försök igen.');
          const rows = await response.json();
          if (!Array.isArray(rows) || rows.length !== 1) throw new Error('Filen finns inte längre eller är inte tillgänglig.');
          // A concurrent content save is safe: this PATCH contains no data payload.
          // A concurrent rename must not silently overwrite this rename.
          params.set('name', rows[0].name == null ? 'is.null' : 'eq.'+rows[0].name);
          if (!allowed(kind,item)) throw new Error('Filen är skrivskyddad.');
          const result = await fetch(SUPA_URL+'/rest/v1/'+SUPA_TABLE+'?'+params,{
            method:'PATCH',headers:{...supaHeaders(),Prefer:'return=representation'},body:JSON.stringify({name})
          });
          if (!result.ok) throw new Error('Namnet kunde inte sparas. Försök igen.');
          const updated = await result.json();
          if (!Array.isArray(updated) || updated.length !== 1 || updated[0].name !== name) throw new Error('Filen ändrades under tiden. Ladda om listan och försök igen.');
        }
        item.name = name;
        for (const other of collection(kind)) if (fileId != null && String(id(kind,other)) === String(fileId)) other.name = name;
        if (kind === 'board' && String(activeFormationId) === String(fileId)) activeFormationName = name;
        dialog.close(); refresh(kind); showToast(fileId == null ? 'Namnet ändrat i utkastet' : 'Filnamnet sparat');
      } catch (err) { error.textContent = err.message || 'Namnet kunde inte sparas.'; }
      finally { busy = false; dialog.querySelectorAll('input,button').forEach(el => el.disabled = false); }
    });
  }
  function attach(row,kind,item) {
    if (kind === 'match' && item.name && item.name !== [item.datum,item.motstand].filter(Boolean).join(' ')) {
      const name = document.createElement('div'); name.className = 'tt-match-file-title'; name.textContent = item.name; row.prepend(name);
    }
    if (!allowed(kind,item)) return;
    const button = document.createElement('button'); button.type = 'button'; button.className = 'sa tt-file-rename';
    button.textContent = '✎'; button.title = 'Byt filnamn'; button.setAttribute('aria-label','Byt filnamn');
    button.addEventListener('click',e => {
      e.preventDefault();e.stopPropagation();if(!allowed(kind,item))return;
      ensureDialog();current = {kind,item};dialog.querySelector('input').value = title(kind,item);dialog.querySelector('[role=alert]').textContent = '';
      dialog.showModal();dialog.querySelector('input').select();
    });
    row.appendChild(button);
  }
  function matchName(match,editId) {
    const saved = editId != null ? (window.matcher || []).find(m => String(m.dbId) === String(editId)) : null;
    const name = match.name || saved?.name || [match.datum,match.motstand].filter(Boolean).join(' ');
    if (match.name || saved?.name) match.name = name;
    return name;
  }
  window.TTFileNames = {attach,matchName};
})();
