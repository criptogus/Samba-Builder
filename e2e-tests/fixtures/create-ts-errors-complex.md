Tests delete-rename-write order
<samba-delete path="src/main.tsx">
</samba-delete>
<samba-rename from="src/App.tsx" to="src/main.tsx">
</samba-rename>
<samba-write path="src/main.tsx" description="final main.tsx file.">
finalMainTsxFileWithError();
</samba-write>
EOM
