import React, { useEffect, useState } from "react";
import API from "../api";

const Profile = () => {
  const [name, setName] = useState(localStorage.getItem("name") || "");
  const [role, setRole] = useState(localStorage.getItem("role") || "");
  const [email] = useState(localStorage.getItem("email") || "");
  const [avatarUrl, setAvatarUrl] = useState(
    localStorage.getItem("avatarUrl") || "",
  );
  const [avatarFile, setAvatarFile] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Har baar Profile page khulte hi latest avatar localStorage se le lo
    const storedAvatar = localStorage.getItem("avatarUrl");
    if (storedAvatar) {
      setAvatarUrl(storedAvatar);
    }

    setLoadingProfile(false);

    // Cleanup: component unmount hone par camera band kar do
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraStream]);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);
    const previewUrl = URL.createObjectURL(file);
    setAvatarUrl(previewUrl);
  };

  // Camera: start video stream
  const handleStartCamera = async () => {
    try {
      setCameraError("");
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          "Camera support available nahi hai (browser permission).",
        );
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      setCameraStream(stream);

      const video = document.getElementById("profile-camera-video");
      if (video) {
        video.srcObject = stream;
        video.play();
      }
    } catch (err) {
      setCameraError("Camera open nahi ho pa rahi. Permission allow karein.");
    }
  };

  // Camera: capture current frame as image file
  const handleCaptureFromCamera = () => {
    const video = document.getElementById("profile-camera-video");
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 320;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "avatar-camera.jpg", {
        type: "image/jpeg",
      });
      setAvatarFile(file);
      const previewUrl = URL.createObjectURL(blob);
      setAvatarUrl(previewUrl);
    }, "image/jpeg");

    // Capture ke turant baad camera band kar do
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
    }
    const videoEl = document.getElementById("profile-camera-video");
    if (videoEl) {
      videoEl.srcObject = null;
    }
    setCameraStream(null);
  };

  const handleAvatarUpload = async (e) => {
    e.preventDefault();
    if (!avatarFile) return;

    try {
      setLoadingAvatar(true);
      setMessage("");
      setError("");

      const formData = new FormData();
      formData.append("avatar", avatarFile);
      if (email) {
        formData.append("email", email);
      }

      // Backend: update profile picture for current user
      const res = await API.put("/users/me/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      let urlFromServer = res.data?.avatarUrl || res.data?.url || avatarUrl;

      // Ensure full URL (http://localhost:5002 + /uploads/..)
      if (urlFromServer && !urlFromServer.startsWith("http")) {
        const apiBase = API.defaults.baseURL || "";
        const serverBase = apiBase.replace(/\/api\/?$/, "");
        urlFromServer = `${serverBase}${urlFromServer}`;
      }

      if (urlFromServer) {
        setAvatarUrl(urlFromServer);
        localStorage.setItem("avatarUrl", urlFromServer);
      }

      setMessage("Profile picture updated successfully.");
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Image upload fail ho gaya. /users/me/avatar endpoint check karein.";
      setError(msg);
    } finally {
      setLoadingAvatar(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Saare password fields bharna zaroori hai.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password aur confirm password match nahi kar rahe.");
      return;
    }

    try {
      setLoadingPassword(true);

      // Backend: change password for current user
      await API.post("/users/change-password", {
        email,
        currentPassword,
        newPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password successfully change ho gaya.");
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Password change fail ho gaya.";
      setError(msg);
    } finally {
      setLoadingPassword(false);
    }
  };

  const prettyRole =
    role && typeof role === "string"
      ? role.charAt(0).toUpperCase() + role.slice(1)
      : "Role";

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Left: avatar + basic info */}
        <div className="profile-section">
          <div className="profile-avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              (name || "U").charAt(0).toUpperCase()
            )}
          </div>

          <div className="profile-info">
            <h2 className="profile-name">{name || "User"}</h2>
            <p className="profile-role">{prettyRole}</p>
          </div>

          <form className="profile-form">
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="simple-input-file"
            />

            <div className="camera-section">
              {cameraError && <p className="camera-error">{cameraError}</p>}

              {cameraStream && (
                <div className="camera-controls">
                  <video
                    id="profile-camera-video"
                    className="camera-video"
                    autoPlay
                    muted
                  />
                  <button
                    type="button"
                    onClick={handleCaptureFromCamera}
                    className="simple-btn simple-btn-primary w-full"
                  >
                    Capture Photo
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loadingAvatar || !avatarFile}
              className="simple-btn simple-btn-primary w-full disabled:opacity-60"
            >
              {loadingAvatar ? "Uploading..." : "Update Profile Picture"}
            </button>
          </form>
        </div>

        {/* Right: password change */}
        <div className="password-section">
          <h3 className="section-title mb-2">Change Password</h3>
          <p className="form-help-text">
            Update your password below. Your current password is required for verification.
          </p>

          {error && (
            <div className="simple-error">
              {error}
            </div>
          )}

          {message && (
            <div className="simple-success">
              {message}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="password-form">
            <div className="simple-form-group">
              <label className="simple-label">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="simple-input w-full"
                placeholder="Enter current password"
              />
            </div>

            <div className="simple-form-group">
              <label className="simple-label">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="simple-input w-full"
                placeholder="Enter new password"
              />
            </div>

            <div className="simple-form-group">
              <label className="simple-label">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="simple-input w-full"
                placeholder="Re-enter new password"
              />
            </div>

            <button
              type="submit"
              disabled={loadingPassword}
              className="simple-btn simple-btn-primary w-full disabled:opacity-60"
            >
              {loadingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>

          {loadingProfile && (
            <p className="loading-hint">
              Loading profile details...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
