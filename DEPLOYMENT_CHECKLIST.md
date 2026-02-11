# ✅ Deployment Checklist

## Pre-Deployment

### Code Quality
- [ ] No console errors: `npm run build` completes successfully
- [ ] No lint warnings: `npm run lint` (if configured)
- [ ] All files saved and committed to git
- [ ] Tested on local machine with arrow keys

### Features Verified
- [ ] App loads without errors
- [ ] Home page loads (3 sections registered)
- [ ] LiveChannels page loads (numeric jump works)
- [ ] LivePlayer works (can navigate channels)
- [ ] Back button works (goes to previous page)
- [ ] Navigation doesn't break other UI components

### Remote Testing (Simulated Keyboard)
- [ ] Arrow Up: Focus moves up ✓
- [ ] Arrow Down: Focus moves down ✓
- [ ] Arrow Left: Focus moves left ✓
- [ ] Arrow Right: Focus moves right ✓
- [ ] Enter: Clicks focused element ✓
- [ ] Escape: Goes back ✓
- [ ] Home: Goes to home page ✓
- [ ] Type "99" + Wait 1s: Jumps to channel 99 ✓

### Documentation
- [ ] LG_WEBOS_REMOTE_NAVIGATION.md reviewed
- [ ] QUICK_REFERENCE.md understood
- [ ] INTEGRATION_SUMMARY.md reviewed
- [ ] IMPLEMENTATION_COMPLETE.md checked

---

## Deployment to LG TV

### Build
```bash
# Clean build
rm -rf build/
npm run build

# Check build size
ls -lh build/static/js/main.*.js
```

### Upload to TV
```bash
# Using web server or ADB
# Transfer build/ folder to TV
# Ensure correct path in webOS app configuration
```

### On TV: First Load
- [ ] App loads successfully
- [ ] No black screen or errors
- [ ] Navigation works with actual remote
- [ ] Focus indicator visible (or CSS takes effect)
- [ ] All pages reachable

### On TV: Remote Testing
#### Navigation Keys
- [ ] d-pad up/down/left/right work
- [ ] OK button selects items
- [ ] Back button goes back
- [ ] Home button goes to home

#### IPTV Feature
- [ ] Type channel number on remote (e.g., 99)
- [ ] HUD shows "Channel: 99" in top-right
- [ ] After 1 second: auto-jumps to channel 99
- [ ] Error shows if channel doesn't exist
- [ ] Multi-digit works (e.g., 180 for channel 180)

#### Pages
- [ ] Home page: 3 sections navigable
- [ ] LiveChannels: categories + grid navigation
- [ ] LanguageChannels: language cards navigable
- [ ] LivePlayer: channel up/down works
- [ ] Settings: options navigable

---

## Post-Deployment

### Monitor & Support
- [ ] Check device logs for errors
- [ ] Monitor user feedback
- [ ] Make note of any remote-specific issues
- [ ] Document workarounds if needed

### Performance
- [ ] App doesn't lag when navigating
- [ ] Focus search is fast
- [ ] No memory leaks on long use

### Future Enhancements
- [ ] Tag other pages with `useSpatialNavSection()` if needed
- [ ] Add custom keys for special features
- [ ] Customize focus visual styles (colors, animations)

---

## Troubleshooting During Deployment

### Issue: Focus stuck on login page
**Solution**: Check if `useSpatialNavSection()` is registered in LoginOtp.jsx

### Issue: Remote keys don't work
**Solution**: 
1. Verify spatial navigation initialized in App.js
2. Check if LG webOS emits key events correctly
3. Try different remote model if available

### Issue: Numeric jump doesn't work
**Solution**:
1. Check if on LiveChannels or LivePlayer
2. Verify channel numbers exist in the list
3. Check browser console for errors
4. Verify `channelno` field matches actual data

### Issue: Navigation jumps around randomly
**Solution**:
1. Reduce number of focusable elements
2. Register sections to limit focus scope
3. Use `useSpatialNavPause()` to disable in sections

### Issue: Visual focus indicator not visible
**Solution**:
1. Check CSS for `[data-focused]` styles
2. Add custom CSS if needed:
   ```css
   [data-focused] {
     outline: 4px solid #667eea;
     outline-offset: 2px;
     box-shadow: 0 0 12px rgba(102, 126, 234, 0.6);
   }
   ```

---

## Quick Debug Commands

### Console Logs
```javascript
// In browser console on TV:
localStorage.getItem('isAuthenticated'); // Should be 'true'
localStorage.getItem('userId');          // Should have value
localStorage.getItem('userPhone');       // Should have value
```

### Check Spatial Nav
```javascript
// In browser console:
console.log('Focus:', document.activeElement); // Should show focused element
```

### Test Remote
```javascript
// In browser console:
window.addEventListener('keydown', (e) => {
  console.log('Key:', e.key, e.keyCode, e.code);
});
// Now press remote buttons and check console
```

---

## Rollback Plan

If something goes wrong:

1. **App won't load**:
   - Check build output
   - Clear browser cache
   - Rebuild with `npm run build`

2. **Navigation broken**:
   - Revert last changes to App.js
   - Rebuild without spatial nav

3. **Remote doesn't work**:
   - Check if key events are emitted
   - Verify LG webOS remote is paired
   - Test with different remote

4. **Channels not found**:
   - Verify channel data format
   - Check `channelno` field name
   - Update channel matching logic

---

## Sign-Off Checklist

- [ ] All code changes completed
- [ ] No breaking changes introduced
- [ ] Documentation complete
- [ ] Tested on local machine
- [ ] Ready for LG TV deployment
- [ ] Remote control support verified
- [ ] IPTV numeric jump working
- [ ] All pages navigable
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Team/stakeholder approval obtained

---

## Version Info

- **Library**: @noriginmedia/norigin-spatial-navigation v3.1.0+
- **Node.js**: 16.x, 18.x, 20.x
- **React**: 16.8+
- **Target**: All LG webOS TVs (2014+)
- **Deployment Date**: ___________
- **Deployed By**: ___________

---

**Status: ✅ READY FOR PRODUCTION DEPLOYMENT**

Last Updated: 2024
Next Review: Post-deployment (1 week)
