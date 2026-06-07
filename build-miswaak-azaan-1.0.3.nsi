Unicode true
Name "Miswaak Azaan"
OutFile "release-voice-icon-1.0.3\Miswaak.Azaan.Setup.1.0.3.exe"
InstallDir "$LOCALAPPDATA\Miswaak Azaan"
RequestExecutionLevel user
Icon "app-asar-work\assets\icon.ico"
UninstallIcon "app-asar-work\assets\icon.ico"
SetCompressor /SOLID lzma

VIProductVersion "1.0.3.0"
VIAddVersionKey "ProductName" "Miswaak Azaan"
VIAddVersionKey "CompanyName" "Rayhan"
VIAddVersionKey "FileDescription" "Miswaak Azaan Setup"
VIAddVersionKey "FileVersion" "1.0.3"
VIAddVersionKey "ProductVersion" "1.0.3"
VIAddVersionKey "LegalCopyright" "Copyright (c) 2026 Rayhan"

Page directory
Page instfiles

UninstPage uninstConfirm
UninstPage instfiles

Section "Install"
  SetOutPath "$INSTDIR"
  File /r "release-voice-icon-1.0.3\win-unpacked\*"

  CreateDirectory "$SMPROGRAMS\Miswaak Azaan"
  CreateShortcut "$SMPROGRAMS\Miswaak Azaan\Miswaak Azaan.lnk" "$INSTDIR\Miswaak Azaan.exe"
  CreateShortcut "$DESKTOP\Miswaak Azaan.lnk" "$INSTDIR\Miswaak Azaan.exe"

  WriteUninstaller "$INSTDIR\Uninstall Miswaak Azaan.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\MiswaakAzaan" "DisplayName" "Miswaak Azaan 1.0.3"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\MiswaakAzaan" "DisplayVersion" "1.0.3"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\MiswaakAzaan" "Publisher" "Rayhan"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\MiswaakAzaan" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\MiswaakAzaan" "DisplayIcon" "$INSTDIR\Miswaak Azaan.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\MiswaakAzaan" "UninstallString" '"$INSTDIR\Uninstall Miswaak Azaan.exe"'
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\MiswaakAzaan" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\MiswaakAzaan" "NoRepair" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\MiswaakAzaan" "EstimatedSize" 322447
SectionEnd

Section "Uninstall"
  Delete "$DESKTOP\Miswaak Azaan.lnk"
  Delete "$SMPROGRAMS\Miswaak Azaan\Miswaak Azaan.lnk"
  RMDir "$SMPROGRAMS\Miswaak Azaan"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\MiswaakAzaan"
  RMDir /r "$INSTDIR"
SectionEnd
