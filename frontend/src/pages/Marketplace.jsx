import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, Plus, BookOpen, User, Sparkles, X, MessageSquare, RefreshCw, Clock, CheckCircle, Trash2 } from 'lucide-react';
import { cachedGet, invalidateCache } from '../apiCache';

// Cache AI-generated syllabi per skill so re-opening a modal is instant
const syllabusCache = new Map();

function Marketplace({ user, token, onUpdateUser, onStartChat }) {
  const [skills, setSkills] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [userBookings, setUserBookings] = useState([]);

  useEffect(() => {
    if (user && user.id) {
      fetchUserBookings();
    }
  }, [user.id]);

  const fetchUserBookings = async () => {
    try {
      const data = await cachedGet(`/api/matches`, {
        ttl: 10_000,
        params: { user_id: user.id }
      });
      setUserBookings(data);
    } catch (err) {
      console.error("Could not fetch user bookings", err);
    }
  };
  
  // Details Modal States
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [syllabus, setSyllabus] = useState([]);
  const [loadingSyllabus, setLoadingSyllabus] = useState(false);

  useEffect(() => {
    if (selectedSkill) {
      fetchSyllabus(selectedSkill);
    } else {
      setSyllabus([]);
    }
  }, [selectedSkill]);

  const fetchSyllabus = async (skill) => {
    // Return cached result immediately if available
    if (syllabusCache.has(skill.id)) {
      setSyllabus(syllabusCache.get(skill.id));
      return;
    }
    setLoadingSyllabus(true);
    try {
      const res = await axios.post('http://127.0.0.1:5000/api/ai/generate-syllabus', {
        title: skill.title,
        description: skill.description,
        num_classes: skill.num_classes,
        category: skill.category
      });
      syllabusCache.set(skill.id, res.data.lectures);
      setSyllabus(res.data.lectures);
    } catch (err) {
      console.error(err);
      const fallbackList = Array.from({ length: skill.num_classes }, (_, i) => `Session ${i + 1}: Core concepts and exercises`);
      setSyllabus(fallbackList);
    } finally {
      setLoadingSyllabus(false);
    }
  };
  
  // New Skill Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCat, setNewCat] = useState('Programming');
  const [newNumClasses, setNewNumClasses] = useState(1);
  const [newTiming, setNewTiming] = useState('Flexible');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);   // skill id currently being deleted
  const [deleteError, setDeleteError] = useState('');   // inline error for failed deletes
  const [bookingMessage, setBookingMessage] = useState('');

  const categories = ['All', 'Programming', 'Design', 'Languages', 'Academics', 'Music', 'Business'];

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    try {
      const data = await cachedGet('/api/skills', { ttl: 15_000 });
      setSkills(data);
    } catch (err) {
      console.error("Could not fetch skills", err);
    }
  };

  const handleAddSkill = async (e) => {
    e.preventDefault();
    if (submitting) return; // guard against double-click
    setFormError('');
    if (!newTitle || !newDesc) {
      setFormError('Please fill out all fields.');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(
        'http://127.0.0.1:5000/api/skills',
        {
          title: newTitle,
          description: newDesc,
          category: newCat,
          num_classes: newNumClasses,
          timing: newTiming
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Invalidate caches so the new listing shows up next visit
      invalidateCache('/api/skills');
      setShowAddModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewNumClasses(1);
      setNewTiming('Flexible');
      fetchSkills();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Error listing your skill. Please verify you are logged in.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSkill = async (skill) => {
    if (deletingId) return; // already deleting something
    if (!window.confirm(`Delete "${skill.title}"? This cannot be undone.`)) return;

    setDeletingId(skill.id);
    setDeleteError('');
    try {
      await axios.delete(`http://127.0.0.1:5000/api/skills/${skill.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      invalidateCache('/api/skills');
      fetchSkills();
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Failed to delete listing.');
      // Auto-clear error after 5 seconds
      setTimeout(() => setDeleteError(''), 5000);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateWithAI = async () => {
    if (!newTitle) {
      setFormError('Please enter a Skill / Topic Title first before using AI.');
      return;
    }
    
    setAiLoading(true);
    setFormError('');
    
    try {
      const res = await axios.post(
        'http://127.0.0.1:5000/api/ai/generate-description',
        { title: newTitle, category: newCat }
      );
      setNewDesc(res.data.description);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to generate description with AI. Please check that the backend is running.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleBookSession = async (skill) => {
    if (skill.instructor_id === user.id) {
      alert("You cannot book your own skill!");
      return;
    }
    
    if (user.credits < 1) {
      alert("You don't have enough Skill Coins! Offer a class to earn coins.");
      return;
    }

    if (!confirm(`Are you sure you want to book "${skill.title}"? This will lock 1 Skill Coin from your balance.`)) {
      return;
    }

    try {
      const res = await axios.post(
        'http://127.0.0.1:5000/api/matches',
        { skill_id: skill.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Deduct coin locally & update user state
      onUpdateUser({ ...user, credits: user.credits - 1 });
      // Invalidate caches so booking status is fresh
      invalidateCache('/api/matches', { user_id: user.id });
      fetchUserBookings();
      setBookingMessage(`Successfully requested session! 1 Coin has been locked. Check your Dashboard to manage the request.`);
      setTimeout(() => setBookingMessage(''), 5000);
    } catch (err) {
      alert(err.response?.data?.message || 'Booking request failed.');
    }
  };

  // Filter skills
  const filteredSkills = skills.filter(skill => {
    const matchesSearch = skill.title.toLowerCase().includes(search.toLowerCase()) || 
                          skill.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'All' || skill.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="w-full max-w-[1600px] space-y-8">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-2">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Skill Marketplace</h2>
          <p className="text-slate-500 text-base mt-1.5 font-medium">Explore classes offered by community experts and request lessons using Skill Coins.</p>
        </div>
        
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center justify-center gap-2 self-start md:self-auto text-sm py-3 px-5"
        >
          <Plus className="w-5 h-5" />
          <span>Offer a Skill</span>
        </button>
      </div>

      {bookingMessage && (
        <div className="p-5 bg-primary-55 border border-primary-100 text-primary-750 rounded-2xl mb-2 text-base flex items-center gap-2.5 shadow-sm shadow-primary-500/5">
          <Sparkles className="w-6 h-6 text-primary-500 shrink-0 animate-pulse" />
          <span className="font-bold">{bookingMessage}</span>
        </div>
      )}

      {deleteError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl mb-2 text-sm flex items-center gap-2.5 shadow-sm">
          <X className="w-5 h-5 text-red-500 shrink-0" />
          <span className="font-bold">{deleteError}</span>
        </div>
      )}

      {/* Filters & Search */}
      <div className="space-y-4 mb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-450" />
          <input
            type="text"
            placeholder="Search programming languages, design concepts, instruments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary-500/80 transition-colors shadow-sm shadow-slate-100/50 text-sm font-semibold"
          />
        </div>
        
        {/* Category Filter Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          {categories.map((cat) => {
            const isActive = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-4.5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap border cursor-pointer shadow-sm active:scale-98 ${
                  isActive
                    ? 'bg-primary-600 border-primary-600 text-white shadow-primary-500/10 shadow-md'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-350 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Course List - Horizontal Details View */}
      {filteredSkills.length > 0 ? (
        <div className="space-y-3.5">
          {/* Table Header - Hidden on mobile */}
          <div className="hidden lg:grid grid-cols-12 gap-5 px-6 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-200/50">
            <div className="col-span-5">Course Topic & Description</div>
            <div className="col-span-2 text-center">Category</div>
            <div className="col-span-1 text-center">Classes</div>
            <div className="col-span-2 text-center">Offered By</div>
            <div className="col-span-2 text-right">Options</div>
          </div>

          {/* Table Rows */}
          {filteredSkills.map(skill => (
            <div 
              key={skill.id} 
              onClick={() => setSelectedSkill(skill)}
              className="card p-5 hover:border-slate-350 hover:shadow-md transition-all border-slate-200/80 cursor-pointer bg-white flex flex-col lg:grid lg:grid-cols-12 lg:items-center gap-4 lg:gap-5"
            >
              {/* Course Title & Description (col-span-5) */}
              <div className="lg:col-span-5 space-y-1.5 text-left min-w-0">
                <h3 className="text-base font-bold text-slate-900 leading-snug hover:text-primary-600 transition-colors truncate">{skill.title}</h3>
                <p className="text-slate-550 text-xs line-clamp-2 leading-relaxed font-semibold">
                  {skill.description}
                </p>
              </div>

              {/* Category (col-span-2) */}
              <div className="lg:col-span-2 flex lg:justify-center">
                <span className="px-3 py-1 text-[11px] font-bold uppercase bg-slate-100/85 text-slate-600 rounded-lg border border-slate-200/60 leading-none">
                  {skill.category}
                </span>
              </div>

              {/* Classes & Schedule (col-span-1) */}
              <div className="lg:col-span-1 flex flex-col lg:items-center text-left lg:text-center space-y-1">
                <span className="inline-block px-2.5 py-1 text-[10px] font-bold bg-primary-50 text-primary-700 rounded-lg border border-primary-100 leading-none">
                  {skill.num_classes} {skill.num_classes === 1 ? 'Class' : 'Classes'}
                </span>
                <span className="text-[10px] text-slate-450 font-bold truncate max-w-full" title={skill.timing}>
                  {skill.timing}
                </span>
              </div>

              {/* Tutor & Star Rating (col-span-2) */}
              <div className="lg:col-span-2 flex items-center lg:justify-center gap-3">
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-150 shadow-sm shrink-0">
                  <User className="w-3.5 h-3.5 text-slate-550" />
                </div>
                <div className="flex flex-col min-w-0 text-left">
                  <span className="text-xs font-bold text-slate-755 truncate leading-none mb-1">{skill.instructor_name}</span>
                  {skill.instructor_rating > 0 ? (
                    <span className="text-[10px] font-black text-amber-500 flex items-center gap-0.5 leading-none">
                      ★ {skill.instructor_rating} <span className="text-slate-400 font-bold">({skill.instructor_reviews_count})</span>
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-400 font-bold italic leading-none">New Member</span>
                  )}
                </div>
              </div>

              {/* Actions (col-span-2) */}
              <div className="lg:col-span-2 flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                {skill.instructor_id === user.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-primary-500 font-bold italic">Your Listing</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteSkill(skill)}
                      disabled={deletingId === skill.id}
                      className="p-1.5 bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-lg transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete listing"
                    >
                      {deletingId === skill.id
                        ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onStartChat({ id: skill.instructor_id, username: skill.instructor_name })}
                      className="p-2 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-900 border border-slate-200 rounded-xl transition-all shadow-sm cursor-pointer"
                      title="Send Message"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    {(() => {
                      const booking = userBookings.find(b => b.skill_id === skill.id && b.learner_id === user.id);
                      if (booking) {
                        if (booking.status === 'pending') {
                          return (
                            <button
                              type="button"
                              disabled
                              className="px-3.5 py-2 bg-amber-50 text-amber-700 border border-amber-150 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-not-allowed opacity-80"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span>Requested</span>
                            </button>
                          );
                        } else if (booking.status === 'accepted') {
                          return (
                            <button
                              type="button"
                              disabled
                              className="px-3.5 py-2 bg-indigo-50 text-indigo-700 border border-indigo-150 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-not-allowed opacity-80"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span>Enrolled</span>
                            </button>
                          );
                        } else if (booking.status === 'completed') {
                          return (
                            <button
                              type="button"
                              disabled
                              className="px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-150 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-not-allowed opacity-80"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Done</span>
                            </button>
                          );
                        }
                      }
                      return (
                        <button
                          type="button"
                          onClick={() => handleBookSession(skill)}
                          className="px-4 py-2 bg-primary-50 hover:bg-primary-600 text-primary-600 hover:text-white border border-primary-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-primary-500/5 active:scale-98"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Book</span>
                        </button>
                      );
                    })()}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center border-dashed border-slate-350 bg-white">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800 mb-1">No Listings Found</h3>
          <p className="text-slate-500 text-sm">Be the first to list a class in this category or search query.</p>
        </div>
      )}

      {/* Add Skill Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-lg card p-7 border-slate-200/80 relative animate-in fade-in zoom-in-95 duration-200 shadow-xl">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-750 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-2xl font-black text-slate-900 mb-1">Offer a Skill</h3>
            <p className="text-slate-500 text-sm mb-6 font-medium">List what you can teach to earn Skill Coins when sessions complete.</p>

            {formError && <div className="p-3.5 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs font-bold mb-4">{formError}</div>}

            <form onSubmit={handleAddSkill} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Class Name</label>
                <input
                  type="text"
                  placeholder="e.g. Python Programming for Beginners"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-primary-500 transition-colors text-sm font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Category</label>
                <select
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:bg-white focus:border-primary-500 transition-colors text-sm font-bold cursor-pointer"
                >
                  {categories.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Number of Classes</label>
                  <input
                    type="number"
                    min="1"
                    value={newNumClasses}
                    onChange={(e) => setNewNumClasses(parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:bg-white focus:border-primary-500 transition-colors text-sm font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Timing / Schedule</label>
                  <input
                    type="text"
                    placeholder="e.g. Saturdays 10 AM, Flexible"
                    value={newTiming}
                    onChange={(e) => setNewTiming(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-primary-500 transition-colors text-sm font-semibold"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Class Description</label>
                  <button
                    type="button"
                    onClick={handleCreateWithAI}
                    disabled={aiLoading}
                    className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{aiLoading ? 'Generating...' : 'Create with AI'}</span>
                  </button>
                </div>
                <textarea
                  rows="4"
                  placeholder="Outline what you will teach. Mention if any prerequisites are required, and the target audience."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-primary-500 transition-colors resize-none text-sm font-semibold"
                  required
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all shadow-sm hover:shadow-md hover:shadow-primary-500/10 mt-6 cursor-pointer text-sm flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : 'Publish Listing'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Course Details Modal */}
      {selectedSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl card p-7 border-slate-200/80 relative animate-in fade-in zoom-in-95 duration-200 shadow-xl max-h-[85vh] overflow-y-auto bg-white">
            <button
              onClick={() => setSelectedSkill(null)}
              className="absolute right-4 top-4 p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-750 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-6">
              <div>
                <span className="px-3 py-1 text-xs font-bold uppercase bg-primary-50 text-primary-700 rounded-lg border border-primary-100/60">
                  {selectedSkill.category}
                </span>
                <h3 className="text-2xl font-black text-slate-900 mt-3 leading-tight">{selectedSkill.title}</h3>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-slate-450 text-xs font-bold">Offered by: {selectedSkill.instructor_name}</span>
                  {selectedSkill.instructor_rating > 0 ? (
                    <span className="text-xs font-bold text-amber-500 flex items-center gap-0.5">
                      ★ {selectedSkill.instructor_rating} ({selectedSkill.instructor_reviews_count} {selectedSkill.instructor_reviews_count === 1 ? 'review' : 'reviews'})
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 font-semibold italic">New Member</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Course Duration</span>
                  <span className="text-sm font-bold text-slate-800 mt-0.5 block">{selectedSkill.num_classes} {selectedSkill.num_classes === 1 ? 'Session' : 'Sessions'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">General Timing</span>
                  <span className="text-sm font-bold text-slate-800 mt-0.5 block">{selectedSkill.timing}</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">About this Class</h4>
                <p className="text-slate-655 text-sm leading-relaxed whitespace-pre-line font-medium">{selectedSkill.description}</p>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-primary-500" />
                  <span>Syllabus & Lecture List</span>
                </h4>
                
                {loadingSyllabus ? (
                  <div className="flex items-center gap-2.5 py-6 text-slate-455 text-xs font-semibold justify-center">
                    <RefreshCw className="w-4 h-4 animate-spin text-primary-500" />
                    <span>Generating curriculum with AI...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {syllabus.map((lecture, idx) => (
                      <div key={idx} className="p-3.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200/60 rounded-xl flex items-start gap-3 transition-colors">
                        <div className="w-6 h-6 rounded-lg bg-primary-50 border border-primary-150 flex items-center justify-center font-bold text-xs text-primary-700 shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-bold text-slate-800 leading-tight block">{lecture}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5 block font-semibold italic">
                            (Specific Date: Scheduled after successful enrollment)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-5 flex justify-end gap-3">
                {selectedSkill.instructor_id !== user.id && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSkill(null);
                        onStartChat({ id: selectedSkill.instructor_id, username: selectedSkill.instructor_name });
                      }}
                      className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4 text-slate-550" />
                      <span>Ask Inquiry / Chat</span>
                    </button>
                    {(() => {
                      const booking = userBookings.find(b => b.skill_id === selectedSkill.id && b.learner_id === user.id);
                      if (booking) {
                        if (booking.status === 'pending') {
                          return (
                            <button
                              type="button"
                              disabled
                              className="px-6 py-3 bg-amber-50 text-amber-700 border border-amber-250 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-not-allowed opacity-80"
                            >
                              <Clock className="w-4 h-4" />
                              <span>Requested</span>
                            </button>
                          );
                        } else if (booking.status === 'accepted') {
                          return (
                            <button
                              type="button"
                              disabled
                              className="px-6 py-3 bg-indigo-50 text-indigo-700 border border-indigo-250 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-not-allowed opacity-80"
                            >
                              <Clock className="w-4 h-4" />
                              <span>Enrolled</span>
                            </button>
                          );
                        } else if (booking.status === 'completed') {
                          return (
                            <button
                              type="button"
                              disabled
                              className="px-6 py-3 bg-emerald-50 text-emerald-700 border border-emerald-250/50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-not-allowed opacity-80"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>Completed</span>
                            </button>
                          );
                        }
                      }
                      return (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSkill(null);
                            handleBookSession(selectedSkill);
                          }}
                          className="px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                        >
                          <BookOpen className="w-4 h-4" />
                          <span>Book Session</span>
                        </button>
                      );
                    })()}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Marketplace;
