import React, { useState, useEffect } from 'react';
import { Box, Typography, Avatar, Button, TextField, Switch, Container } from '@mui/material';

export default function ProfileSelector() {
  const [profiles, setProfiles] = useState([]);
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isKidsProfile, setIsKidsProfile] = useState(false);

  // Load profiles from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem("profiles");
    if (saved) setProfiles(JSON.parse(saved));
  }, []);

  // Save to LocalStorage
  const saveProfiles = (updated) => {
    setProfiles(updated);
    localStorage.setItem("profiles", JSON.stringify(updated));
  };

  const handleAddProfileClick = () => {
    setShowAddProfile(true);
  };

  const handleCancel = () => {
    setShowAddProfile(false);
    setNewProfileName('');
    setUploadedImage(null);
    setIsKidsProfile(false);
  };

  const handleCreateProfile = () => {
    if (!newProfileName.trim() || !uploadedImage) return;

    const newProfile = {
      id: Date.now(),
      name: newProfileName,
      image: uploadedImage,
      isKids: isKidsProfile,
    };

    const updatedProfiles = [...profiles, newProfile];
    saveProfiles(updatedProfiles);
    handleCancel();
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => setUploadedImage(e.target.result);
    reader.readAsDataURL(file);
  };

  // ----------------------------
  // ADD PROFILE SCREEN UI
  // ----------------------------
  if (showAddProfile) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: '#000',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4
        }}
      >
        <Container maxWidth="sm">
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" sx={{ mb: 2 }}>
              Add Profile
            </Typography>

            {/* Avatar Upload */}
            <Box sx={{ mb: 3 }}>
              <Avatar
                src={uploadedImage || ""}
                sx={{
                  width: 140,
                  height: 140,
                  margin: '0 auto',
                  border: '3px solid #fff',
                  cursor: 'pointer'
                }}
                onClick={() => document.getElementById('upload').click()}
              />

              <input
                id="upload"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageUpload}
              />

              <Typography variant="body2" sx={{ mt: 1, color: '#808080' }}>
                Click image to upload
              </Typography>
            </Box>

            {/* Name */}
            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                placeholder="Enter Profile Name"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#333',
                    color: '#fff',
                    '& fieldset': { borderColor: '#333' },
                    '&:hover fieldset': { borderColor: '#555' },
                    '&.Mui-focused fieldset': { borderColor: '#fff' }
                  }
                }}
              />
            </Box>

            {/* Kids Toggle */}
            <Box
              sx={{
                bgcolor: '#333',
                borderRadius: '4px',
                p: 2,
                mb: 4,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Typography>Kids Profile</Typography>
              <Switch
                checked={isKidsProfile}
                onChange={(e) => setIsKidsProfile(e.target.checked)}
              />
            </Box>

            {/* Buttons */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                onClick={handleCreateProfile}
                disabled={!newProfileName.trim() || !uploadedImage}
                sx={{
                  bgcolor: '#0071eb',
                  color: '#fff',
                  px: 4,
                  py: 1,
                  '&:disabled': { bgcolor: '#333', color: '#777' }
                }}
              >
                Create Profile
              </Button>

              <Button
                variant="outlined"
                onClick={handleCancel}
                sx={{
                  borderColor: '#777',
                  color: '#777',
                  px: 4,
                }}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>
    );
  }

  // ----------------------------
  // MAIN "WHO'S WATCHING" SCREEN
  // ----------------------------

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#000',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h3" sx={{ mb: 5 }}>
          Who's Watching?
        </Typography>

        <Box
          sx={{
            display: 'flex',
            gap: 3,
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}
        >
          {/* Dynamic Profiles */}
          {profiles.map((profile) => (
            <Box key={profile.id}>
              <Avatar
                src={profile.image}
                sx={{
                  width: 120,
                  height: 120,
                  mb: 1,
                  border: '2px solid transparent',
                }}
              />
              <Typography sx={{ color: '#ccc' }}>{profile.name}</Typography>
            </Box>
          ))}

          {/* Add Profile Box */}
          <Box onClick={handleAddProfileClick} sx={{ cursor: 'pointer' }}>
            <Box
              sx={{
                width: 120,
                height: 120,
                border: '2px solid #808080',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1
              }}
            >
              <Typography sx={{ fontSize: 40, color: '#808080' }}>+</Typography>
            </Box>
            <Typography sx={{ color: '#808080' }}>Add Profile</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
