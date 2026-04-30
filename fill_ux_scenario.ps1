$path = "D:\Sparks Projects\BBNL-LGTV\ux_scenario_document_4.4_BBNL.ppt"
$ppt = New-Object -ComObject PowerPoint.Application

function Set-CellText {
    param($table, [int]$r, [int]$c, [string]$text)
    try {
        $cell = $table.Cell($r, $c)
        $cell.Shape.TextFrame.TextRange.Text = $text
    } catch {
        Write-Output "  WARN: failed r$r c$c"
    }
}

try {
    $pres = $ppt.Presentations.Open($path, $false, $false, $false)

    # ---- SLIDE 1: Title page ----
    $s1 = $pres.Slides.Item(1)
    foreach ($shape in $s1.Shapes) {
        if ($shape.HasTextFrame -eq -1 -and $shape.TextFrame.HasText -eq -1) {
            $t = $shape.TextFrame.TextRange.Text
            if ($t -match 'Please Write Your App Title') {
                $shape.TextFrame.TextRange.Text = 'BBNL IPTV'
            }
        }
        if ($shape.HasTable -eq -1) {
            $tbl = $shape.Table
            Set-CellText $tbl 1 2 '2026 / 04 / 29'
            Set-CellText $tbl 2 2 '2.0.0'
            Set-CellText $tbl 3 2 ("Name: BBNL`r`nE-mail address: support@bbnl.in")
        }
    }

    # ---- SLIDE 3: Basic Information ----
    $s3 = $pres.Slides.Item(3)
    foreach ($shape in $s3.Shapes) {
        if ($shape.HasTable -eq -1) {
            $tbl = $shape.Table
            Set-CellText $tbl 2 3 'BBNL IPTV'
            Set-CellText $tbl 3 3 'Entertainment'
            Set-CellText $tbl 4 3 'Web'
            Set-CellText $tbl 5 3 '1920*1080 / 3840*2160'
            Set-CellText $tbl 6 3 'India'
            Set-CellText $tbl 7 3 'English, Hindi, Tamil, Telugu'
            Set-CellText $tbl 8 3 'No'
            Set-CellText $tbl 9 3 'webOS (3.0 and later)'
            Set-CellText $tbl 10 3 'Banner AD (server-served via /iptvads), Video AVOD (pre-roll via /streamAds)'
            Set-CellText $tbl 11 3 'Not Applicable (subscriptions managed externally by BBNL)'
            Set-CellText $tbl 12 3 'Not Applicable (not a game)'
            Set-CellText $tbl 13 3 'Not Applicable (login-required app, no public service URL)'
            Set-CellText $tbl 14 3 'Not Applicable (OTP-based login, see slide 6 for QA test accounts)'
            Set-CellText $tbl 15 3 'webOS'
        }
    }

    # ---- SLIDE 4: Document History ----
    $s4 = $pres.Slides.Item(4)
    foreach ($shape in $s4.Shapes) {
        if ($shape.HasTable -eq -1) {
            $tbl = $shape.Table
            Set-CellText $tbl 2 1 '1'
            Set-CellText $tbl 2 2 '29.04.2026'
            Set-CellText $tbl 2 3 '1.0.0'
            Set-CellText $tbl 2 4 'BBNL_IPTV_UX_Scenario_v1.0.ppt'
            Set-CellText $tbl 2 5 'Initial document for LG Content Store submission of com.bbnl.iptv v2.0.0'
        }
    }

    # ---- SLIDE 6: Login info ----
    $s6 = $pres.Slides.Item(6)
    foreach ($shape in $s6.Shapes) {
        if ($shape.HasTable -eq -1) {
            $tbl = $shape.Table
            Set-CellText $tbl 2 2 'Phone number input field - 10-digit Indian mobile number (validated client-side)'
            Set-CellText $tbl 3 2 'Send OTP button - triggers SMS OTP via /loginOtp endpoint and navigates to OTP entry screen'
            Set-CellText $tbl 4 1 'Test Accounts (Phone / OTP)'
            Set-CellText $tbl 4 2 'Test Accounts (Phone / OTP)'
            Set-CellText $tbl 5 2 '[TBD by BBNL backend team] Phone: +91-XXXXXXXXXX / OTP: XXXXXX (bypass)'
            Set-CellText $tbl 6 2 '[TBD by BBNL backend team] Phone: +91-XXXXXXXXXX / OTP: XXXXXX (bypass)'
            Set-CellText $tbl 7 2 '[TBD by BBNL backend team] Phone: +91-XXXXXXXXXX / OTP: XXXXXX (bypass)'
            Set-CellText $tbl 9 2 'Not Applicable'
            Set-CellText $tbl 10 2 'Not Applicable'
            Set-CellText $tbl 11 2 'Not Applicable'
        }
    }

    # ---- SLIDE 7: Start Page (login) ----
    $s7 = $pres.Slides.Item(7)
    foreach ($shape in $s7.Shapes) {
        if ($shape.HasTable -eq -1) {
            $tbl = $shape.Table
            Set-CellText $tbl 2 2 'BBNL logo and "BBNL IPTV" app title displayed at top of login screen'
            Set-CellText $tbl 3 2 'Phone number input field - accepts 10-digit Indian mobile number'
            Set-CellText $tbl 4 2 'Send OTP button - triggers SMS OTP via /loginOtp endpoint, navigates to OTP entry'
        }
    }

    # ---- SLIDE 8: Main Page (Home) ----
    $s8 = $pres.Slides.Item(8)
    foreach ($shape in $s8.Shapes) {
        if ($shape.HasTable -eq -1) {
            $tbl = $shape.Table
            Set-CellText $tbl 2 2 'Home content area - featured channels, recently watched, language carousels, OTT app shortcuts'
            Set-CellText $tbl 3 2 'Left sidebar navigation - Home, Live TV, Search, OTT Apps, Settings (focusable with Magic Remote)'
        }
    }

    # ---- SLIDE 10: Sub Menu ----
    $s10 = $pres.Slides.Item(10)
    foreach ($shape in $s10.Shapes) {
        if ($shape.HasTable -eq -1) {
            $tbl = $shape.Table
            Set-CellText $tbl 2 2 'Live TV category tabs - News, Entertainment, Sports, Movies, Kids, Music (loaded from /chnl_categlist)'
            Set-CellText $tbl 3 2 'Channel tile (logo + channel number + name) - press OK to start streaming the channel'
        }
    }

    # ---- SLIDE 11: Sub Page (player) ----
    $s11 = $pres.Slides.Item(11)
    foreach ($shape in $s11.Shapes) {
        if ($shape.HasTable -eq -1) {
            $tbl = $shape.Table
            Set-CellText $tbl 2 2 'Stream Player - full-screen HLS playback (hls.js) with channel logo and program-title overlay'
            Set-CellText $tbl 3 2 'Player controls (auto-hide) - channel up/down, info, EPG, settings, back to channel list'
        }
    }

    # ---- SLIDE 12: Paid Content (Not Applicable) ----
    $s12 = $pres.Slides.Item(12)
    foreach ($shape in $s12.Shapes) {
        if ($shape.HasTable -eq -1) {
            $tbl = $shape.Table
            Set-CellText $tbl 2 2 'Not Applicable - no in-app payments'
            Set-CellText $tbl 3 2 'Not Applicable - subscriptions are managed externally by BBNL through partner cable operators. The app only authenticates pre-existing subscribers via OTP.'
            Set-CellText $tbl 4 2 'Not Applicable'
            Set-CellText $tbl 5 2 'Not Applicable'
            Set-CellText $tbl 7 2 'Not Applicable'
            Set-CellText $tbl 8 2 'Not Applicable'
            Set-CellText $tbl 10 2 'Not Applicable'
            Set-CellText $tbl 11 2 'Not Applicable'
            Set-CellText $tbl 12 2 'Not Applicable'
        }
    }

    # ---- SLIDE 13: Banner Ads ----
    $s13 = $pres.Slides.Item(13)
    foreach ($shape in $s13.Shapes) {
        if ($shape.HasTable -eq -1) {
            $tbl = $shape.Table
            Set-CellText $tbl 3 2 'Page: Home Page - banner displayed in main content area'
            Set-CellText $tbl 4 2 'Location: Full-width banner served from /iptvads API endpoint, refreshed periodically'
        }
    }

    # ---- SLIDE 14: Video Ads ----
    $s14 = $pres.Slides.Item(14)
    foreach ($shape in $s14.Shapes) {
        if ($shape.HasTable -eq -1) {
            $tbl = $shape.Table
            Set-CellText $tbl 3 1 '1'
            Set-CellText $tbl 3 2 'Pre-roll video ads played before live channel streams begin'
            Set-CellText $tbl 4 1 '2'
            Set-CellText $tbl 4 2 'Ads served via /streamAds API endpoint, controlled by BBNL ad server'
            Set-CellText $tbl 5 1 '3'
            Set-CellText $tbl 5 2 'Skippable after a few seconds; ad data piped through hls.js xhrSetup'
        }
    }

    # ---- SLIDE 15: Appendix ----
    $s15 = $pres.Slides.Item(15)
    foreach ($shape in $s15.Shapes) {
        if ($shape.HasTextFrame -eq -1 -and $shape.TextFrame.HasText -eq -1) {
            $t = $shape.TextFrame.TextRange.Text
            if ($t -match 'If you have anything') {
                $appendix = "Notes for LG QA Management:`r`n`r`n" +
                    "1. AUTHENTICATION`r`n" +
                    "   BBNL IPTV uses phone-number-based OTP authentication only - no username/password. To test the login flow, the QA team will need test phone numbers with bypass OTP codes coordinated through the BBNL backend team. See slide 6 for placeholder credentials.`r`n`r`n" +
                    "2. APP ID HISTORY`r`n" +
                    "   This app was previously sideloaded under com.lg.bbnl but was renamed to com.bbnl.iptv for store submission, since the com.lg.* namespace is reserved for LG system apps.`r`n`r`n" +
                    "3. SUPPORTED PLATFORMS`r`n" +
                    "   Tested on LG webOS 3.0 (2017) and later. Earlier webOS versions are not supported because the app is built with React 19, which requires Chrome 53 and above (available from webOS 3.0).`r`n`r`n" +
                    "4. SUBSCRIPTION MODEL`r`n" +
                    "   No in-app payments are processed. Users must already hold a valid BBNL subscription managed by their cable operator. The app authenticates and delivers content; billing is external.`r`n`r`n" +
                    "5. DATA PRIVACY`r`n" +
                    "   Privacy Policy: https://bbnl-iptv-legal.vercel.app/privacy.html`r`n" +
                    "   Terms of Service: https://bbnl-iptv-legal.vercel.app/terms.html`r`n" +
                    "   Contact: https://bbnl-iptv-legal.vercel.app/contact.html`r`n`r`n" +
                    "6. CONTACT FOR QA QUERIES`r`n" +
                    "   General support: support@bbnl.in`r`n" +
                    "   Privacy / data requests: privacy@bbnl.in`r`n`r`n" +
                    "7. KEY API ENDPOINTS (for QA reference)`r`n" +
                    "   Authentication: /login, /loginOtp, /ssologin`r`n" +
                    "   Channels: /chnl_data, /chnl_categlist, /chnl_langlist`r`n" +
                    "   Streaming: /stream`r`n" +
                    "   Analytics: /trpdata, /ottlogs`r`n" +
                    "   Ads: /iptvads (banner), /streamAds (video)`r`n`r`n" +
                    "Thank you for reviewing BBNL IPTV."
                $shape.TextFrame.TextRange.Text = $appendix
            }
        }
    }

    $pres.Save()
    $pres.Close()
    Write-Output "SUCCESS: saved $path"
}
catch {
    Write-Output "ERROR: $_"
}
finally {
    $ppt.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
}
