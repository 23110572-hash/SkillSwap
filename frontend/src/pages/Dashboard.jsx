import { useState, useEffect } from 'react';
import axios from 'axios';
import { Coins, BookOpen, GraduationCap, CheckCircle, Clock, Check, X, ExternalLink, Settings, Camera, Calendar, RefreshCw, Sparkles, Star, Trash2, Mail } from 'lucide-react';
import { cachedGet, invalidateCache } from '../apiCache';

function Dashboard({ user, token, onUpdateUser, onSelectMatch, setPage }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mySkills, setMySkills] = useState([]);
  const [deletingSkillId, setDeletingSkillId] = useState(null);
  const [deleteSkillError, setDeleteSkillError] = useState('');
  
  // Schedule Modal States
  const [selectedScheduleMatch, setSelectedScheduleMatch] = useState(null);
  const [scheduleSyllabus, setScheduleSyllabus] = useState([]);
  const [loadingScheduleSyllabus, setLoadingScheduleSyllabus] = useState(false);
  const [emailingSchedule, setEmailingSchedule] = useState(false);
  const [emailStatus, setEmailStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'

  // Review Modal & Rating States
  const [selectedReviewMatch, setSelectedReviewMatch] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [tutorRating, setTutorRating] = useState(0.0);
  const [tutorReviewsCount, setTutorReviewsCount] = useState(0);

  useEffect(() => {
    if (selectedScheduleMatch) {
      fetchScheduleSyllabus(selectedScheduleMatch);
    } else {
      setScheduleSyllabus([]);
      setEmailStatus('idle');
    }
  }, [selectedScheduleMatch]);

  const handleEmailSchedule = async () => {
    if (!selectedScheduleMatch) return;
    setEmailingSchedule(true);
    setEmailStatus('loading');
    try {
      await axios.post(
        `http://127.0.0.1:5000/api/matches/${selectedScheduleMatch.id}/email-schedule`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEmailStatus('success');
      setTimeout(() => setEmailStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setEmailStatus('error');
      setTimeout(() => setEmailStatus('idle'), 3000);
    } finally {
      setEmailingSchedule(false);
    }
  };

  const fetchScheduleSyllabus = async (match) => {
    setLoadingScheduleSyllabus(true);
    try {
      const res = await axios.get(`http://127.0.0.1:5000/api/matches/${match.id}/classes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setScheduleSyllabus(res.data.map(c => c.title));
    } catch (err) {
      console.error(err);
      const fallbackList = Array.from({ length: match.num_classes || 1 }, (_, i) => `Session ${i + 1}: Core concepts and exercises`);
      setScheduleSyllabus(fallbackList);
    } finally {
      setLoadingScheduleSyllabus(false);
    }
  };

  const calculateScheduleDates = (timing, numClasses) => {
    const daysOfWeek = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
    };
    
    const timingLower = timing.toLowerCase();
    let targetDay = 1; // Default to Monday
    let found = false;
    
    for (const [dayName, dayNum] of Object.entries(daysOfWeek)) {
      if (timingLower.includes(dayName) || timingLower.includes(dayName.slice(0, 3))) {
        targetDay = dayNum;
        found = true;
        break;
      }
    }
    
    if (!found && timingLower.includes("weekend")) {
      targetDay = 6; // Saturday
    }
    
    const dates = [];
    let current = new Date();
    
    let daysUntil = (targetDay - current.getDay() + 7) % 7;
    if (daysUntil === 0) daysUntil = 7;
    current.setDate(current.getDate() + daysUntil);
    
    let hour = 10;
    let minute = 0;
    const timeMatch = timingLower.match(/(\d+)(?::(\d+))?\s*(am|pm)?/);
    if (timeMatch) {
      hour = parseInt(timeMatch[1]);
      minute = parseInt(timeMatch[2]) || 0;
      const ampm = timeMatch[3];
      if (ampm === "pm" && hour < 12) hour += 12;
      if (ampm === "am" && hour === 12) hour = 0;
    }
    current.setHours(hour, minute, 0, 0);
    
    for (let i = 0; i < numClasses; i++) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 7);
    }
    return dates;
  };
  
  // Edit Profile States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState(user.username);
  const [newEmail, setNewEmail] = useState(user.email);
  const [newPhotoBase64, setNewPhotoBase64] = useState(user.profile_pic || '');
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNewUsername(user.username);
    setNewEmail(user.email);
    setNewPhotoBase64(user.profile_pic || '');
    setModalError('');
    setModalSuccess('');
  }, [user]);

  useEffect(() => {
    // Run all three fetches in parallel to cut load time by ~2/3
    Promise.all([fetchMatches(), fetchTutorRating(), fetchMySkills()]);
  }, [user.id]);

  const fetchMySkills = async () => {
    try {
      const data = await cachedGet('/api/skills', { ttl: 15_000 });
      const userSkills = data.filter(s => Number(s.instructor_id) === Number(user.id));
      setMySkills(userSkills);
    } catch (err) {
      console.error("Could not fetch user skills", err);
    }
  };

  const fetchMatches = async () => {
    try {
      const data = await cachedGet('/api/matches', {
        ttl: 10_000,
        params: { user_id: user.id }
      });
      setMatches(data);
      setLoading(false);
    } catch (err) {
      console.error("Could not fetch matches", err);
      setLoading(false);
    }
  };

  const fetchTutorRating = async () => {
    try {
      const res = await axios.get(`http://127.0.0.1:5000/api/users/${user.id}/reviews`);
      setTutorRating(res.data.average_rating);
      setTutorReviewsCount(res.data.count);
    } catch (err) {
      console.error("Could not fetch tutor rating", err);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    setReviewError('');
    setReviewSuccess('');

    try {
      await axios.post(
        'http://127.0.0.1:5000/api/reviews',
        {
          match_id: selectedReviewMatch.id,
          rating: reviewRating,
          comment: reviewComment
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setReviewSuccess('Thank you! Review submitted successfully.');
      
      // Refresh matches list & profile ratings
      fetchMatches();
      fetchTutorRating();

      setTimeout(() => {
        setSelectedReviewMatch(null);
        setReviewRating(5);
        setReviewComment('');
        setReviewSuccess('');
      }, 1500);
    } catch (err) {
      setReviewError(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleUpdateStatus = async (matchId, newStatus) => {
    try {
      await axios.patch(
        `http://127.0.0.1:5000/api/matches/${matchId}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Invalidate so next fetchMatches gets fresh data
      invalidateCache('/api/matches', { user_id: user.id });
      fetchMatches();

      const meRes = await axios.get('http://127.0.0.1:5000/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      onUpdateUser(meRes.data);
    } catch (err) {
      alert("Failed to update status.");
    }
  };

  const handleEnterRoom = (match) => {
    onSelectMatch(match);
    setPage('session-room');
  };

  const handleDeleteSkill = async (skill) => {
    if (deletingSkillId) return;
    if (!window.confirm(`Delete "${skill.title}"? This cannot be undone.`)) return;
    setDeletingSkillId(skill.id);
    setDeleteSkillError('');
    try {
      await axios.delete(`http://127.0.0.1:5000/api/skills/${skill.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      invalidateCache('/api/skills');
      fetchMySkills();
    } catch (err) {
      setDeleteSkillError(err.response?.data?.message || 'Failed to delete listing.');
      setTimeout(() => setDeleteSkillError(''), 5000);
    } finally {
      setDeletingSkillId(null);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size limit: 1.5MB = 1.5 * 1024 * 1024 bytes
    if (file.size > 1.5 * 1024 * 1024) {
      setModalError("Image is too large. Please select an image smaller than 1.5MB.");
      return;
    }

    setModalError('');
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewPhotoBase64(reader.result);
    };
    reader.onerror = () => {
      setModalError("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setModalError('');
    setModalSuccess('');

    try {
      const res = await axios.patch(
        'http://127.0.0.1:5000/api/auth/profile',
        {
          username: newUsername,
          email: newEmail,
          profile_pic: newPhotoBase64 || null
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      // On success, check if email changed
      if (res.data.email_changed) {
        setModalSuccess('Email changed! Please verify your new email.');
        setTimeout(() => {
          localStorage.removeItem('token');
          window.location.reload();
        }, 1500);
        return;
      }

      // On success, update the parent state
      onUpdateUser(res.data);
      setModalSuccess('Profile updated successfully!');
      
      // Close the modal after a short delay so they see the success message
      setTimeout(() => {
        setIsEditModalOpen(false);
        setModalSuccess('');
      }, 1000);
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const myTeaches = matches.filter(m => Number(m.teacher_id) === Number(user.id));
  const myLearns = matches.filter(m => Number(m.learner_id) === Number(user.id));

  return (
    <div className="w-full max-w-[1600px] space-y-10">
      {/* Profile Overview Card */}
      <div className="card p-10 bg-gradient-to-br from-slate-900 via-indigo-955 to-slate-950 border-slate-800 text-white flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 shadow-xl shadow-indigo-950/10 relative overflow-hidden">
        {/* Glowing background elements inside card */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="absolute left-1/3 bottom-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-[60px] pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
          {/* Avatar Container */}
          <div className="shrink-0">
            {user.profile_pic ? (
              <img 
                src={user.profile_pic} 
                alt="Profile" 
                className="w-24 h-24 rounded-full object-cover border-4 border-slate-800 shadow-md"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary-600 to-indigo-500 text-white flex items-center justify-center text-3xl font-black border-4 border-slate-800 shadow-md">
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          <div className="text-center sm:text-left space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Signed in as</div>
            <h2 className="text-4xl font-black text-white leading-tight">{user.username}</h2>
            <p className="text-indigo-200 text-base font-semibold">{user.email}</p>
            <div className="pt-2">
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-98 cursor-pointer flex items-center gap-1.5 mx-auto sm:mx-0"
              >
                <Settings className="w-3.5 h-3.5 text-indigo-300" />
                <span>Edit Profile</span>
              </button>
            </div>
          </div>
        </div>

        {/* Peer Role Stats: Everyone is Teaching & Learning */}
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto shrink-0 relative z-10">
          <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-4 rounded-2xl shadow-sm flex-1 sm:flex-initial">
            <div className="p-3 bg-white/10 rounded-xl border border-white/5">
              <GraduationCap className="text-indigo-300 w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Learning</div>
              <div className="text-lg font-black text-white mt-0.5">{myLearns.length} <span className="text-xs font-semibold text-slate-300">Requested</span></div>
              <div className="text-[10px] text-indigo-250 font-semibold">{myLearns.filter(m => m.status === 'completed').length} completed</div>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-4 rounded-2xl shadow-sm flex-1 sm:flex-initial">
            <div className="p-3 bg-white/10 rounded-xl border border-white/5">
              <BookOpen className="text-indigo-300 w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-455 uppercase tracking-wider">Offering</div>
              <div className="text-lg font-black text-white mt-0.5">{myTeaches.length} <span className="text-xs font-semibold text-slate-300">Offered</span></div>
              {tutorReviewsCount > 0 ? (
                <div className="text-[10px] text-amber-400 font-bold flex items-center gap-0.5 mt-0.5">
                  ★ {tutorRating} ({tutorReviewsCount} {tutorReviewsCount === 1 ? 'review' : 'reviews'})
                </div>
              ) : (
                <div className="text-[10px] text-slate-400 font-semibold italic mt-0.5">No reviews yet</div>
              )}
            </div>
          </div>
        </div>
        
        {/* Coin Balance */}
        <div className="flex items-center gap-5 bg-white/5 border border-white/10 px-8 py-5 rounded-2xl shrink-0 shadow-sm w-full lg:w-auto relative z-10">
          <div className="p-4 bg-gradient-to-tr from-primary-500 to-indigo-500 rounded-2xl shadow-md">
            <Coins className="text-white w-7 h-7" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-450 uppercase tracking-wider">Skill Coin Balance</div>
            <div className="text-4xl font-black text-white mt-1">{user.credits} <span className="text-sm font-semibold text-indigo-250">Coins</span></div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-150 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-black text-slate-900">Edit Profile</h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-655 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveProfile} className="p-6 space-y-5">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-750 rounded-xl text-xs font-bold">
                  {modalError}
                </div>
              )}
              {modalSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-755 rounded-xl text-xs font-bold">
                  {modalSuccess}
                </div>
              )}

              {/* Avatar Upload Selection */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative group shrink-0">
                  {newPhotoBase64 ? (
                    <img 
                      src={newPhotoBase64} 
                      alt="Avatar Preview" 
                      className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md shadow-slate-200/80 group-hover:opacity-90 transition-opacity"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-primary-600 text-white flex items-center justify-center text-3xl font-black border-4 border-white shadow-md shadow-slate-200/80 group-hover:bg-primary-500 transition-colors">
                      {newUsername ? newUsername.charAt(0).toUpperCase() : '?'}
                    </div>
                  )}
                  
                  {/* Camera overlay */}
                  <label 
                    htmlFor="avatar-file" 
                    className="absolute bottom-0 right-0 p-2 bg-white border border-slate-200 text-slate-600 hover:text-slate-800 rounded-full shadow-md hover:bg-slate-50 active:scale-95 transition-all cursor-pointer flex items-center justify-center border-cool"
                    title="Upload Photo"
                  >
                    <Camera className="w-4 h-4" />
                    <input 
                      type="file" 
                      id="avatar-file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
                
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Click camera icon to change photo
                </span>
                
                {newPhotoBase64 && (
                  <button
                    type="button"
                    onClick={() => setNewPhotoBase64('')}
                    className="text-xs text-red-500 hover:text-red-650 font-bold transition-colors cursor-pointer"
                  >
                    Remove Photo
                  </button>
                )}
              </div>

              {/* Input Username */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Username</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 transition-all text-sm font-medium"
                  placeholder="Username"
                  required
                />
              </div>

              {/* Input Email */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 transition-all text-sm font-medium"
                  placeholder="Email"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded-xl text-sm font-bold transition-all cursor-pointer text-center"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-sm font-bold transition-all shadow-sm active:scale-[0.98] cursor-pointer flex items-center justify-center"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Learning Board */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <GraduationCap className="text-primary-500 w-6 h-6" />
            <h3 className="text-2xl font-black text-slate-900">Sessions I'm Learning</h3>
          </div>

          {loading ? (
            <div className="text-slate-400 text-base">Loading learning requests...</div>
          ) : myLearns.length > 0 ? (
            <div className="space-y-5">
              {myLearns.map(match => (
                <div key={match.id} className="card p-6 border-slate-250/60 flex items-start justify-between gap-5">
                  <div className="space-y-2">
                    <h4 className="text-lg font-bold text-slate-900 leading-snug">{match.skill_title}</h4>
                    <p className="text-sm text-slate-600 font-semibold">Offered by: {match.teacher_name}</p>
                    
                    <div className="flex items-center gap-2 pt-2">
                      {match.status === 'pending' && (
                        <span className="flex items-center gap-1.5 text-xs text-amber-700 font-bold uppercase bg-amber-50 border border-amber-250/50 px-3 py-1 rounded-lg">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Pending Acceptance</span>
                        </span>
                      )}
                      {match.status === 'accepted' && (
                        <span className="flex items-center gap-1.5 text-xs text-indigo-700 font-bold uppercase bg-indigo-50 border border-indigo-250/50 px-3 py-1 rounded-lg">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Scheduled</span>
                        </span>
                      )}
                      {match.status === 'completed' && (
                        <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold uppercase bg-emerald-50 border border-emerald-250/50 px-3 py-1 rounded-lg">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Completed</span>
                        </span>
                      )}
                      {match.status === 'rejected' && (
                        <span className="flex items-center gap-1.5 text-xs text-red-700 font-bold uppercase bg-red-50 border border-red-200/60 px-3 py-1 rounded-lg">
                          <X className="w-3.5 h-3.5" />
                          <span>Declined</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {match.status === 'accepted' && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => setSelectedScheduleMatch(match)}
                        className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-98 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Calendar className="w-4 h-4 text-slate-550" />
                        <span>Schedule</span>
                      </button>
                    </div>
                  )}

                  {match.status === 'completed' && (
                    <div className="flex gap-2 shrink-0">
                      {match.reviewed ? (
                        <span className="px-3.5 py-2.5 bg-slate-50 text-slate-500 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Reviewed</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setReviewRating(5);
                            setReviewComment('');
                            setSelectedReviewMatch(match);
                          }}
                          className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-98 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>Leave Review</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-10 text-center text-slate-500 border-dashed border-slate-300 bg-white text-base">
              You haven't requested any sessions yet. Visit the Marketplace to find a skill to learn!
            </div>
          )}
        </div>        {/* Offering Board */}
        <div className="space-y-8">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="text-indigo-500 w-6 h-6" />
            <h3 className="text-2xl font-black text-slate-900">Sessions I'm Offering</h3>
          </div>

          {/* Part A: Active Sessions */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Active Session Requests</h4>
            {loading ? (
              <div className="text-slate-400 text-sm">Loading sessions...</div>
            ) : myTeaches.filter(m => m.status !== 'completed').length > 0 ? (
              <div className="space-y-4">
                {myTeaches.filter(m => m.status !== 'completed').map(match => (
                  <div key={match.id} className="card p-5 border-slate-200/80 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                    <div className="space-y-1.5 flex-1">
                      <h5 className="text-base font-bold text-slate-950">{match.skill_title}</h5>
                      <p className="text-xs text-slate-550 font-semibold">Requested by: {match.learner_name}</p>
                      <div className="pt-1 flex gap-2">
                        {match.status === 'pending' && (
                          <span className="inline-flex items-center gap-1.5 text-[9px] text-amber-700 font-black uppercase bg-amber-50 border border-amber-255 px-2 py-0.5 rounded">
                            Pending Approval
                          </span>
                        )}
                        {match.status === 'accepted' && (
                          <span className="inline-flex items-center gap-1.5 text-[9px] text-indigo-700 font-black uppercase bg-indigo-50 border border-indigo-250 px-2 py-0.5 rounded">
                            Active / Scheduled
                          </span>
                        )}
                        {match.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1.5 text-[9px] text-slate-500 font-black uppercase bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                            Declined
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {match.status === 'pending' && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-center text-xs font-bold text-slate-500 shrink-0">
                        Manage request in Auditor Room
                      </div>
                    )}

                    {match.status === 'accepted' && (
                      <button
                        type="button"
                        onClick={() => setSelectedScheduleMatch(match)}
                        className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto"
                      >
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>View Schedule</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 border border-dashed border-slate-250 bg-white/50 rounded-2xl text-xs font-semibold">
                No active session requests yet. Accept requests in the Auditor Room!
              </div>
            )}
          </div>

          {/* Part A2: Completed Sessions */}
          {myTeaches.filter(m => m.status === 'completed').length > 0 && (
            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Completed Sessions</h4>
              <div className="space-y-3">
                {myTeaches.filter(m => m.status === 'completed').map(match => (
                  <div key={match.id} className="card p-4 border-emerald-100 bg-emerald-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                    <div className="space-y-0.5 flex-1">
                      <h5 className="text-sm font-bold text-slate-800">{match.skill_title}</h5>
                      <p className="text-xs text-slate-500 font-semibold">Requested by: {match.learner_name}</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-[9px] text-emerald-700 font-black uppercase bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-lg shrink-0">
                      <CheckCircle className="w-3 h-3" /> Completed
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Part B: My listed skills */}
          <div className="space-y-4 pt-4">
            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">My Skill Listings in Marketplace</h4>

            {deleteSkillError && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold flex items-center gap-2">
                <X className="w-4 h-4 text-red-500 shrink-0" />
                <span>{deleteSkillError}</span>
              </div>
            )}

            {loading ? (
              <div className="text-slate-400 text-sm">Loading listings...</div>
            ) : mySkills.length > 0 ? (
              <div className="space-y-4">
                {mySkills.map(skill => {
                  const activeBookingsCount = myTeaches.filter(b => b.skill_id === skill.id && b.status !== 'completed').length;
                  return (
                    <div key={skill.id} className="card p-5 border-slate-200/80 bg-white shadow-sm space-y-2">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <h5 className="text-base font-bold text-slate-900 leading-snug">{skill.title}</h5>
                          <p className="text-slate-500 text-xs line-clamp-1 leading-normal font-semibold mt-1">{skill.description}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2.5 py-1 text-[10px] font-bold bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 leading-none uppercase">
                            {skill.num_classes} {skill.num_classes === 1 ? 'Class' : 'Classes'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteSkill(skill)}
                            disabled={deletingSkillId === skill.id || activeBookingsCount > 0}
                            title={activeBookingsCount > 0 ? `Cannot delete — ${activeBookingsCount} active session(s)` : 'Delete listing'}
                            className="p-1.5 bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-lg transition-all shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {deletingSkillId === skill.id
                              ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-bold text-slate-450 uppercase pt-1 border-t border-slate-100/50">
                        <span>Category: {skill.category}</span>
                        <span>•</span>
                        <span>Schedule: {skill.timing}</span>
                        <span>•</span>
                        <span className={activeBookingsCount > 0 ? 'text-amber-600' : 'text-primary-600'}>
                          {activeBookingsCount} Active Session{activeBookingsCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 border border-dashed border-slate-250 bg-white/50 rounded-2xl text-xs font-semibold">
                You haven't listed any skills in the Marketplace yet. Go to Marketplace to list one!
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Course Schedule & Syllabus Modal */}
      {selectedScheduleMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl card p-7 border-slate-200/80 relative animate-in fade-in zoom-in-95 duration-200 shadow-xl max-h-[85vh] overflow-y-auto bg-white">
            <button
              onClick={() => setSelectedScheduleMatch(null)}
              className="absolute right-4 top-4 p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-750 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-6">
              <div>
                <span className="px-3 py-1 text-xs font-bold uppercase bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-150">
                  {selectedScheduleMatch.category} - Enrolled Session
                </span>
                <h3 className="text-2xl font-black text-slate-900 mt-3 leading-tight">{selectedScheduleMatch.skill_title}</h3>
                <div className="text-slate-455 text-xs font-bold mt-1.5 flex gap-4">
                  <span>Offered by: {selectedScheduleMatch.teacher_name}</span>
                  <span>Requested by: {selectedScheduleMatch.learner_name}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Sessions</span>
                  <span className="text-sm font-bold text-slate-800 mt-0.5 block">{selectedScheduleMatch.num_classes} Classes</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Timing Rule</span>
                  <span className="text-sm font-bold text-slate-800 mt-0.5 block">{selectedScheduleMatch.timing}</span>
                </div>
              </div>

              {selectedScheduleMatch.skill_description && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Class Description</h4>
                  <p className="text-slate-655 text-sm leading-relaxed whitespace-pre-line font-medium">{selectedScheduleMatch.skill_description}</p>
                </div>
              )}

              <div className="border-t border-slate-100 pt-5">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    <span>Finalized Lecture Dates & Syllabus</span>
                  </h4>
                  <button
                    onClick={handleEmailSchedule}
                    disabled={emailingSchedule}
                    className={`px-3 py-1.5 border rounded-xl text-xs font-bold transition-all shadow-sm active:scale-98 flex items-center gap-1.5 cursor-pointer ${
                      emailStatus === 'success'
                        ? 'bg-emerald-50 border-emerald-250 text-emerald-700'
                        : emailStatus === 'error'
                        ? 'bg-red-50 border-red-200 text-red-750'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    {emailStatus === 'loading' ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : emailStatus === 'success' ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : emailStatus === 'error' ? (
                      <X className="w-3.5 h-3.5" />
                    ) : (
                      <Mail className="w-3.5 h-3.5 text-slate-550" />
                    )}
                    <span>
                      {emailStatus === 'loading'
                        ? 'Sending...'
                        : emailStatus === 'success'
                        ? 'Emailed!'
                        : emailStatus === 'error'
                        ? 'Failed!'
                        : 'Email Schedule'}
                    </span>
                  </button>
                </div>
                
                {loadingScheduleSyllabus ? (
                  <div className="flex items-center gap-2.5 py-6 text-slate-455 text-xs font-semibold justify-center">
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                    <span>Loading finalized schedule...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(() => {
                      const dates = calculateScheduleDates(selectedScheduleMatch.timing, selectedScheduleMatch.num_classes);
                      return scheduleSyllabus.map((lecture, idx) => {
                        const dateObj = dates[idx] || new Date();
                        const formattedDate = dateObj.toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        });
                        const formattedTime = dateObj.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                        
                        return (
                          <div key={idx} className="p-3.5 bg-indigo-50/10 border border-indigo-100/50 rounded-xl flex items-start gap-3">
                            <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-150 flex items-center justify-center font-bold text-xs text-indigo-700 shrink-0">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-bold text-slate-800 leading-tight block">{lecture}</span>
                              <span className="text-[11px] text-indigo-650 mt-1 font-bold flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{formattedDate} at {formattedTime}</span>
                              </span>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave Review Modal */}
      {selectedReviewMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-150 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-black text-slate-900">Leave Feedback</h3>
              <button 
                onClick={() => setSelectedReviewMatch(null)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-655 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitReview} className="p-6 space-y-5">
              <div className="text-center space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Leave Feedback For</span>
                <h4 className="text-lg font-black text-slate-800">{selectedReviewMatch.teacher_name}</h4>
                <p className="text-slate-500 text-xs">For course: <span className="font-semibold text-slate-700">"{selectedReviewMatch.skill_title}"</span></p>
              </div>

              {reviewError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-750 rounded-xl text-xs font-bold">
                  {reviewError}
                </div>
              )}
              {reviewSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-755 rounded-xl text-xs font-bold">
                  {reviewSuccess}
                </div>
              )}

              {/* Star Rating selector */}
              <div className="space-y-1.5 text-center">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Rate your experience</label>
                <div className="flex justify-center gap-2.5 py-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                    >
                      <Star
                        className={`w-9 h-9 ${
                          star <= reviewRating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-200 fill-slate-100'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <div className="text-xs font-bold text-amber-500 capitalize">
                  {reviewRating === 5 && 'Excellent session!'}
                  {reviewRating === 4 && 'Very good experience!'}
                  {reviewRating === 3 && 'Good overall'}
                  {reviewRating === 2 && 'Needs improvement'}
                  {reviewRating === 1 && 'Unsatisfactory session'}
                </div>
              </div>

              {/* Comment Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Review Feedback</label>
                <textarea
                  rows="4"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 transition-all text-sm font-medium resize-none"
                  placeholder="Share details about the class structure, clarity of instructions, responsiveness..."
                  required
                ></textarea>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedReviewMatch(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded-xl text-sm font-bold transition-all cursor-pointer text-center"
                  disabled={submittingReview}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-sm font-bold transition-all shadow-sm active:scale-[0.98] cursor-pointer flex items-center justify-center"
                  disabled={submittingReview}
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
