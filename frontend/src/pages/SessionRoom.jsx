import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Play, Sparkles, CheckCircle2, AlertTriangle, Lightbulb, RefreshCw, Check, ArrowLeft, Award, Video, MessageSquare, BookOpen, Clock, GraduationCap, X, Star, Calendar, Lock, Unlock, Info } from 'lucide-react';

function SessionRoom({ user, token, activeMatch, onUpdateUser, setPage }) {
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [auditResult, setAuditResult] = useState(null);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  const jitsiApiRef = useRef(null);
  const jitsiContainerRef = useRef(null);

  // Classroom Auditor Hub States
  const [currentMatch, setCurrentMatch] = useState(activeMatch);
  const [activeMatchesList, setActiveMatchesList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState('audit'); // audit, syllabus

  // Multi-Course Hub States
  const [expandedMatchId, setExpandedMatchId] = useState(null);
  const [hubSyllabi, setHubSyllabi] = useState({});
  const [loadingHubSyllabi, setLoadingHubSyllabi] = useState({});
  const [checkedSyllabusMap, setCheckedSyllabusMap] = useState({});

  // Multi-Class Advanced Progression States
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [activeClass, setActiveClass] = useState(null);
  const [schedulingClassId, setSchedulingClassId] = useState(null);
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [completingClass, setCompletingClass] = useState(null);
  const [classSummary, setClassSummary] = useState('');
  const [classNotes, setClassNotes] = useState('');
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState(null);


  const presets = [
    {
      title: "Python Variables Lesson (Excellent Structure)",
      description: "A high-quality python lesson covering variables, dynamic typing, and function scopes.",
      text: "Partner 1: Welcome back! Today we are learning python variables. Unlike static languages like C++ or Java, Python uses dynamic typing. This means you do not declare a variable's type. For example, writing x = 5 makes x an integer. Writing x = 'hello' makes it a string dynamically. Let's write a function. def calculate_area(width, height): return width * height. Notice how we use the 'def' keyword and return statement. Do you have any questions?\nPartner 2: No, that makes total sense. The syntax is super clean!"
    },
    {
      title: "React Hooks Session (Partially Accurate)",
      description: "Explains React state, but omits key concepts on hook usage constraints.",
      text: "Partner 1: Let's talk about React state and hooks today. To declare state in a functional component, we use the useState hook. For example, const [count, setCount] = useState(0). To update the state, we call setCount(count + 1). Note that state updates are asynchronous, meaning React pools state transitions and re-renders the component. You can trigger side effects using useEffect. We can write them anywhere, even inside an if statement or a loop if we want to run conditional fetches.\nPartner 2: Wait, can we write hooks inside loops? I thought there was a rule against that."
    },
    {
      title: "General Math Session (Basic Lesson)",
      description: "A standard lesson covering algebraic equations with simple explanations.",
      text: "Partner 1: Today we are looking at linear equations. An equation like y = mx + c represents a straight line. Here, 'm' represents the slope of the line, which tells us how steep it is. 'c' represents the y-intercept, where the line crosses the y-axis. To solve for x, we rearrange the equation. For example, if 2x + 4 = 10, we subtract 4 from both sides to get 2x = 6, and divide by 2 to get x = 3. Is this clear?\nPartner 2: Yes, the step-by-step numbers really helped."
    }
  ];

  useEffect(() => {
    setCurrentMatch(activeMatch);
  }, [activeMatch]);

  useEffect(() => {
    fetchActiveMatches();
  }, [user.id]);



  const fetchClasses = async (matchId) => {
    if (!matchId) return;
    setLoadingClasses(true);
    try {
      const res = await axios.get(`http://127.0.0.1:5000/api/matches/${matchId}/classes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClasses(res.data);
    } catch (err) {
      console.error("Error fetching class sessions", err);
    } finally {
      setLoadingClasses(false);
    }
  };

  useEffect(() => {
    if (currentMatch) {
      fetchClasses(currentMatch.id);
    } else {
      setClasses([]);
      setActiveClass(null);
    }
  }, [currentMatch]);


  const fetchActiveMatches = async () => {
    setLoadingList(true);
    try {
      const res = await axios.get(`http://127.0.0.1:5000/api/matches?user_id=${user.id}`);
      const activeMatches = res.data.filter(m => m.status === 'accepted' || m.status === 'pending');
      setActiveMatchesList(activeMatches);

      // Load initial checkbox progress mapping from localStorage
      const tempChecked = {};
      activeMatches.forEach(match => {
        const saved = localStorage.getItem(`completed_syllabus_${match.id}`);
        if (saved) {
          tempChecked[match.id] = JSON.parse(saved);
        } else {
          tempChecked[match.id] = new Array(match.num_classes || 1).fill(false);
        }
      });
      setCheckedSyllabusMap(tempChecked);
    } catch (err) {
      console.error("Could not fetch active matches for hub", err);
    } finally {
      setLoadingList(false);
    }
  };

  const handleUpdateStatus = async (matchId, newStatus) => {
    try {
      await axios.patch(
        `http://127.0.0.1:5000/api/matches/${matchId}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      fetchActiveMatches();
      
      const meRes = await axios.get('http://127.0.0.1:5000/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      onUpdateUser(meRes.data);
    } catch (err) {
      alert("Failed to update status.");
    }
  };

  const handleToggleHubSyllabusItem = (matchId, index, totalClasses) => {
    const current = checkedSyllabusMap[matchId] ? [...checkedSyllabusMap[matchId]] : new Array(totalClasses).fill(false);
    // Ensure array length matches totalClasses
    while (current.length < totalClasses) {
      current.push(false);
    }
    current[index] = !current[index];
    
    const updatedMap = { ...checkedSyllabusMap, [matchId]: current };
    setCheckedSyllabusMap(updatedMap);
    localStorage.setItem(`completed_syllabus_${matchId}`, JSON.stringify(current));
  };

  const handleToggleExpand = async (match) => {
    if (expandedMatchId === match.id) {
      setExpandedMatchId(null);
      return;
    }
    
    setExpandedMatchId(match.id);
    
    // Fetch curriculum from DB on demand if not cached
    if (!hubSyllabi[match.id]) {
      if (match.status === 'pending') {
        const fallbackList = Array.from({ length: match.num_classes || 1 }, (_, i) => `Session ${i + 1}: Core concepts and exercises`);
        setHubSyllabi(prev => ({ ...prev, [match.id]: fallbackList }));
        return;
      }

      setLoadingHubSyllabi(prev => ({ ...prev, [match.id]: true }));
      try {
        const res = await axios.get(`http://127.0.0.1:5000/api/matches/${match.id}/classes`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setHubSyllabi(prev => ({ ...prev, [match.id]: res.data.map(c => c.title) }));
      } catch (err) {
        console.error("Hub syllabus load error:", err);
        const fallbackList = Array.from({ length: match.num_classes || 1 }, (_, i) => `Session ${i + 1}: Core concepts and exercises`);
        setHubSyllabi(prev => ({ ...prev, [match.id]: fallbackList }));
      } finally {
        setLoadingHubSyllabi(prev => ({ ...prev, [match.id]: false }));
      }
    }
  };

  const getMatchProgress = (match) => {
    let checkedArr = checkedSyllabusMap[match.id];
    if (!checkedArr) {
      const saved = localStorage.getItem(`completed_syllabus_${match.id}`);
      if (saved) {
        checkedArr = JSON.parse(saved);
      } else {
        checkedArr = new Array(match.num_classes || 1).fill(false);
      }
    }
    const completed = checkedArr.filter(Boolean).length;
    const total = match.num_classes || 1;
    return {
      completed,
      total,
      percent: Math.round((completed / total) * 100)
    };
  };

  useEffect(() => {
    if (!activeClass) {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
      return;
    }

    const initJitsi = () => {
      try {
        if (!jitsiContainerRef.current) return;
        if (jitsiApiRef.current) {
          jitsiApiRef.current.dispose();
          jitsiApiRef.current = null;
        }
        const api = new window.JitsiMeetExternalAPI('meet.guifi.net', {
          roomName: `SkillSwap-Room-Session-${currentMatch.id}-Class-${activeClass.class_number}`,
          width: '100%',
          height: '100%',
          parentNode: jitsiContainerRef.current,
          userInfo: { displayName: user.username, email: user.email },
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            disableModeratorIndicator: true,
            enableEmailInStats: false
          },
          interfaceConfigOverwrite: {
            TILE_VIEW_MAX_COLUMNS: 2,
            SHOW_JITSI_WATERMARK: false,
            SHOW_BRAND_WATERMARK: false
          }
        });
        jitsiApiRef.current = api;
      } catch (err) {
        console.error('Jitsi init error:', err);
      }
    };

    // Load Jitsi API script
    const JITSI_SCRIPT_ID = 'jitsi-external-api';
    const existingScript = document.getElementById(JITSI_SCRIPT_ID);
    if (existingScript && !existingScript.src.includes('meet.guifi.net')) {
      existingScript.remove();
      if (window.JitsiMeetExternalAPI) {
        delete window.JitsiMeetExternalAPI;
      }
    }

    if (window.JitsiMeetExternalAPI) {
      initJitsi();
    } else if (!document.getElementById(JITSI_SCRIPT_ID)) {
      const script = document.createElement('script');
      script.id = JITSI_SCRIPT_ID;
      script.src = 'https://meet.guifi.net/external_api.js';
      script.async = true;
      script.onload = initJitsi;
      document.head.appendChild(script);
    } else {
      const script = document.getElementById(JITSI_SCRIPT_ID);
      script.addEventListener('load', initJitsi, { once: true });
    }

    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
    };
  }, [activeClass, user]);


  const handleRunAudit = async () => {
    if (!transcript.trim()) {
      alert("Please enter a session transcript or select a demo preset.");
      return;
    }

    setLoading(true);
    setAuditResult(null);

    try {
      const res = await axios.post('http://127.0.0.1:5000/api/sessions/audit', {
        transcript: transcript
      });
      setAuditResult(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Audit failed. Check that the server is online.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSession = async () => {
    if (!confirm("Are you sure you want to mark this lesson as completed? This will transfer 1 Skill Coin to the offering member and finalize the course match.")) {
      return;
    }
    try {
      await axios.patch(
        `http://127.0.0.1:5000/api/matches/${currentMatch.id}`,
        { status: 'completed' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSessionCompleted(true);
      
      // Update local coins
      const meRes = await axios.get('http://127.0.0.1:5000/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      onUpdateUser(meRes.data);
    } catch (err) {
      alert("Failed to complete session.");
    }
  };

  const handleSaveSchedule = async (classId, dateString) => {
    try {
      await axios.patch(
        `http://127.0.0.1:5000/api/classes/${classId}`,
        { scheduled_at: dateString || null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSchedulingClassId(null);
      setScheduledDateTime('');
      fetchClasses(currentMatch.id);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save schedule.");
    }
  };

  const handleStartClass = (classSess) => {
    const isPreviousCompleted = classSess.class_number === 1 || classes.find(prev => prev.class_number === classSess.class_number - 1)?.completed_at;
    if (!isPreviousCompleted) {
      alert("Please complete the previous class first!");
      return;
    }

    const now = new Date();
    if (classSess.scheduled_at && now < new Date(classSess.scheduled_at)) {
      alert(`This class is scheduled for ${new Date(classSess.scheduled_at).toLocaleString()}. You cannot start it yet!`);
      return;
    }

    setActiveClass(classSess);
    setTranscript('');
    setAuditResult(null);
  };

  const handleGenerateAiSummary = async () => {
    if (!completingClass) return;
    setGeneratingSummary(true);
    try {
      const res = await axios.post(
        'http://127.0.0.1:5000/api/ai/generate-summary',
        {
          title: completingClass.title,
          notes: classNotes,
          skill_title: currentMatch ? currentMatch.skill_title : 'General Skill',
          category: currentMatch ? currentMatch.category : 'General'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setClassSummary(res.data.summary);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to generate AI summary.");
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleCompleteClassSession = async () => {
    if (!classSummary.trim()) {
      alert("Please provide a summary of what was taught in this class.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        completed: true,
        summary: classSummary,
        notes: classNotes,
        ai_feedback: auditResult ? JSON.stringify(auditResult) : null
      };

      const res = await axios.patch(
        `http://127.0.0.1:5000/api/classes/${completingClass.id}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.match_status === 'completed') {
        setSessionCompleted(true);
        const meRes = await axios.get('http://127.0.0.1:5000/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        onUpdateUser(meRes.data);
      }

      setCompletingClass(null);
      setClassSummary('');
      setClassNotes('');
      setActiveClass(null);
      fetchClasses(currentMatch.id);
      fetchActiveMatches();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to complete class session.");
    } finally {
      setLoading(false);
    }
  };

  const isTeacher = currentMatch ? Number(currentMatch.teacher_id) === Number(user.id) : false;

  if (!currentMatch) {
    const myTeaches = activeMatchesList.filter(m => Number(m.teacher_id) === Number(user.id));
    const myLearns = activeMatchesList.filter(m => Number(m.learner_id) === Number(user.id));

    return (
      <div className="w-full max-w-[1600px] space-y-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Classroom Auditor Hub</h2>
          <p className="text-slate-550 text-sm mt-1.5 font-medium leading-relaxed">
            Manage your active courses. Select a classroom to conduct live video calls, log session notes, check off syllabus milestones, and run AI audits.
          </p>
        </div>

        {loadingList ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-primary-500" />
            <span className="text-sm font-semibold">Loading classrooms...</span>
          </div>
        ) : activeMatchesList.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Learning Hub Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <GraduationCap className="text-primary-500 w-6 h-6" />
                <h3 className="text-2xl font-black text-slate-900">Learning Classrooms</h3>
              </div>

              {myLearns.length > 0 ? (
                <div className="space-y-4">
                  {myLearns.map(match => {
                    const progress = getMatchProgress(match);
                    return (
                      <div key={match.id} className="card p-6 bg-white flex flex-col gap-5 border border-slate-200/80 shadow-sm hover:shadow-md/5 transition-all">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                          <div className="space-y-2 flex-1">
                            <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-indigo-50 text-indigo-700 rounded border border-indigo-150">
                              {match.category}
                            </span>
                            <h4 className="text-lg font-bold text-slate-900 leading-snug">{match.skill_title}</h4>
                            <p className="text-xs text-slate-500 font-semibold">Offered by: {match.teacher_name}</p>
                            
                            {/* Progress slider bar (only if approved) */}
                            {match.status !== 'pending' && (
                              <div className="pt-2 max-w-sm">
                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
                                  <div className="bg-primary-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress.percent}%` }}></div>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-bold text-slate-455 mt-1.5 uppercase">
                                  <span>Classes Completed</span>
                                  <span>{progress.completed} / {progress.total}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {match.status === 'pending' ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200/50 rounded-xl text-[10px] font-bold shrink-0 self-center uppercase tracking-wider">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Awaiting Approval</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 shrink-0">
                              <button
                                onClick={() => handleToggleExpand(match)}
                                className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-705 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                              >
                                <BookOpen className="w-4 h-4 text-slate-550" />
                                <span>{expandedMatchId === match.id ? 'Hide Syllabus' : 'Manage Syllabus'}</span>
                              </button>

                              <button
                                onClick={() => setCurrentMatch(match)}
                                className="px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-98 cursor-pointer flex items-center gap-1.5"
                              >
                                <Video className="w-4 h-4" />
                                <span>Enter Classroom</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Expanded Syllabus Section */}
                        {expandedMatchId === match.id && match.status !== 'pending' && (
                          <div className="border-t border-slate-150 pt-5 mt-2 animate-in fade-in slide-in-from-top-3 duration-250">
                            <div className="flex justify-between items-center mb-3">
                              <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-400">Course Syllabus & Session Checklist</h5>
                              <span className="text-[10px] text-slate-400 font-semibold italic">Timing: {match.timing}</span>
                            </div>

                            {loadingHubSyllabi[match.id] ? (
                              <div className="flex items-center gap-2 py-4 justify-center text-slate-400 text-xs font-semibold">
                                <RefreshCw className="w-4 h-4 animate-spin text-primary-500" />
                                <span>Generating lesson plan...</span>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {(hubSyllabi[match.id] || []).map((lecture, idx) => {
                                  const checkedArr = checkedSyllabusMap[match.id] || [];
                                  const isChecked = checkedArr[idx] || false;
                                  return (
                                    <label
                                      key={idx}
                                      className={`p-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3 cursor-pointer select-none transition-all ${
                                        isChecked ? 'border-primary-100 bg-primary-50/10' : ''
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handleToggleHubSyllabusItem(match.id, idx, match.num_classes)}
                                        className="w-4 h-4 text-primary-655 border-slate-350 rounded focus:ring-primary-500 mt-0.5 cursor-pointer accent-primary-600"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <span className={`text-xs font-bold leading-tight block ${isChecked ? 'line-through text-slate-400' : 'text-slate-750'}`}>
                                          Session {idx + 1}: {lecture}
                                        </span>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="card p-10 text-center text-slate-500 border-dashed border-slate-300 bg-white text-base font-semibold">
                  You are not currently enrolled in any active classes. Request and finalize classes on the Marketplace!
                </div>
              )}
            </div>

            {/* Teaching Hub Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <BookOpen className="text-indigo-500 w-6 h-6" />
                <h3 className="text-2xl font-black text-slate-900">Classrooms I'm Offering</h3>
              </div>

              {myTeaches.length > 0 ? (
                <div className="space-y-4">
                  {myTeaches.map(match => {
                    const progress = getMatchProgress(match);
                    return (
                      <div key={match.id} className="card p-6 bg-white flex flex-col gap-5 border border-slate-200/80 shadow-sm hover:shadow-md/5 transition-all">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                          <div className="space-y-2 flex-1">
                            <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-primary-50 text-primary-700 rounded border border-primary-100">
                              {match.category}
                            </span>
                            <h4 className="text-lg font-bold text-slate-900 leading-snug">{match.skill_title}</h4>
                            <p className="text-xs text-slate-500 font-semibold">Requested by: {match.learner_name}</p>

                            {/* Progress slider bar (only if approved) */}
                            {match.status !== 'pending' && (
                              <div className="pt-2 max-w-sm">
                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
                                  <div className="bg-primary-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress.percent}%` }}></div>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-bold text-slate-455 mt-1.5 uppercase">
                                  <span>Classes Completed</span>
                                  <span>{progress.completed} / {progress.total}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {match.status === 'pending' ? (
                            <div className="flex gap-2.5 shrink-0 self-center">
                              <button
                                onClick={() => handleUpdateStatus(match.id, 'accepted')}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-98 cursor-pointer flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Accept Request</span>
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(match.id, 'rejected')}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-655 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Decline</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 shrink-0">
                              <button
                                onClick={() => handleToggleExpand(match)}
                                className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-705 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                              >
                                <BookOpen className="w-4 h-4 text-slate-550" />
                                <span>{expandedMatchId === match.id ? 'Hide Syllabus' : 'Manage Syllabus'}</span>
                              </button>

                              <button
                                onClick={() => setCurrentMatch(match)}
                                className="px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-98 cursor-pointer flex items-center gap-1.5"
                              >
                                <Video className="w-4 h-4" />
                                <span>Enter Classroom</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Expanded Syllabus Section */}
                        {expandedMatchId === match.id && match.status !== 'pending' && (
                          <div className="border-t border-slate-150 pt-5 mt-2 animate-in fade-in slide-in-from-top-3 duration-250">
                            <div className="flex justify-between items-center mb-3">
                              <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-400">Course Syllabus & Session Checklist</h5>
                              <span className="text-[10px] text-slate-400 font-semibold italic">Timing: {match.timing}</span>
                            </div>

                            {loadingHubSyllabi[match.id] ? (
                              <div className="flex items-center gap-2 py-4 justify-center text-slate-400 text-xs font-semibold">
                                <RefreshCw className="w-4 h-4 animate-spin text-primary-500" />
                                <span>Generating lesson plan...</span>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {(hubSyllabi[match.id] || []).map((lecture, idx) => {
                                  const checkedArr = checkedSyllabusMap[match.id] || [];
                                  const isChecked = checkedArr[idx] || false;
                                  return (
                                    <label
                                      key={idx}
                                      className={`p-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3 cursor-pointer select-none transition-all ${
                                        isChecked ? 'border-primary-100 bg-primary-50/10' : ''
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handleToggleHubSyllabusItem(match.id, idx, match.num_classes)}
                                        className="w-4 h-4 text-primary-655 border-slate-350 rounded focus:ring-primary-500 mt-0.5 cursor-pointer accent-primary-600"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <span className={`text-xs font-bold leading-tight block ${isChecked ? 'line-through text-slate-400' : 'text-slate-750'}`}>
                                          Session {idx + 1}: {lecture}
                                        </span>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="card p-10 text-center text-slate-500 border-dashed border-slate-300 bg-white text-base font-semibold">
                  No one is currently taking classes from you. Make sure to list skills in the Marketplace!
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="card p-12 text-center border-dashed border-slate-350 bg-white max-w-2xl mx-auto space-y-4">
            <Video className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-lg font-black text-slate-800">No Classrooms Available</h3>
            <p className="text-slate-555 text-sm leading-relaxed">
              You must have an approved booking to access classrooms. Visit the Marketplace to request a course, or approve pending requests in your Auditor Room!
            </p>
            <button
              onClick={() => setPage('marketplace')}
              className="btn-primary py-2 px-4 text-xs font-bold"
            >
              Go to Marketplace
            </button>
          </div>
        )}
      </div>
    );
  }

  // Classroom Active View
  if (activeClass) {
    return (
      <div className="w-full max-w-[1600px] space-y-6">
        {/* Active Class Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-6 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (confirm("Are you sure you want to leave the live classroom? Your active call will end.")) {
                  setActiveClass(null);
                  fetchClasses(currentMatch.id);
                }
              }}
              className="p-2.5 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
              title="Back to Course Lobby"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Lobby</span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-150 rounded-lg text-[9px] font-black uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                  Live Classroom
                </span>
                <span className="text-slate-400 text-xs font-bold">Class {activeClass.class_number} of {classes.length}</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 mt-1">{activeClass.title}</h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setCompletingClass(activeClass);
                setClassSummary('');
                setClassNotes(transcript);
              }}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-emerald-500/10 active:scale-98 flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Complete & Log Class</span>
            </button>
          </div>
        </div>

        {/* Live Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Jitsi Call & Notes (8/12) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="card overflow-hidden border-slate-200/80 bg-slate-950 p-2 shadow-lg relative h-[450px] flex flex-col justify-center">
              <div ref={jitsiContainerRef} className="w-full h-full rounded-xl overflow-hidden" />
            </div>

            {/* Notes Section */}
            <div className="card p-5 border-slate-200/80 flex flex-col bg-white min-h-[250px] shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-850 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-primary-500" />
                    <span>Classroom Notes & Spoken Dialogs</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Type technical notes or paste the live transcript here to feed it into the AI Auditor.
                  </p>
                </div>
              </div>

              <textarea
                rows="6"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste class dialogue or type technical notes here..."
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-primary-500/85 transition-colors resize-none font-mono text-xs leading-relaxed flex-1"
              />

              <div className="flex justify-between items-center mt-3">
                <button
                  onClick={() => setTranscript('')}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors font-bold cursor-pointer"
                >
                  Clear Notes
                </button>
                <button
                  onClick={handleRunAudit}
                  disabled={loading}
                  className="btn-primary bg-primary-600 hover:bg-primary-500 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-xs py-2 px-4"
                >
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Evaluate with AI Auditor</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Sidebar: AI Auditor & Syllabus Checklist (4/12) */}
          <div className="lg:col-span-4 flex flex-col">
            <div className="card p-5 border-slate-200 bg-slate-50/20 flex flex-col h-full shadow-sm">
              <div className="flex border-b border-slate-200 mb-4 bg-slate-100/50 p-1 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveSidebarTab('audit')}
                  className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeSidebarTab === 'audit'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  AI Auditor
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSidebarTab('syllabus')}
                  className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeSidebarTab === 'syllabus'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Course Syllabus
                </button>
              </div>

              {/* AI Auditor Tab */}
              {activeSidebarTab === 'audit' && (
                <div className="flex-1 flex flex-col justify-between h-full">
                  {loading && (
                    <div className="flex flex-col items-center justify-center py-20 px-4 space-y-4 text-center my-auto">
                      <RefreshCw className="w-10 h-10 text-primary-500 animate-spin" />
                      <h4 className="text-base font-bold text-slate-800">Auditing Class...</h4>
                      <p className="text-slate-400 text-xs leading-normal max-w-xs font-semibold">
                        Evaluating clarity, accuracy, and structural peer-to-peer lesson interactions.
                      </p>
                    </div>
                  )}

                  {!auditResult && !loading && (
                    <div className="space-y-6 flex-1 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-primary-500" />
                            <span>AI Auditor Dashboard</span>
                          </h3>
                          <p className="text-slate-455 text-xs font-semibold leading-normal mt-1">
                            Run an evaluation on your classroom notes or dialogue transcript to retrieve instant pedagogical feedback and checklist checks.
                          </p>
                        </div>

                        <div className="border-t border-slate-200/60 pt-4">
                          <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2.5">Simulate Templates</h4>
                          <div className="space-y-2">
                            {presets.map((preset, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setTranscript(preset.text)}
                                className="w-full p-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-all text-xs space-y-0.5 cursor-pointer shadow-sm"
                              >
                                <div className="font-bold text-slate-800 text-xs">{preset.title}</div>
                                <div className="text-slate-400 text-[10px] leading-snug">{preset.description}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-slate-200/60 pt-4">
                        <button
                          onClick={handleRunAudit}
                          className="w-full py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>Run AI Audit Analysis</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {auditResult && !loading && (
                    <div className="space-y-6 flex-1 flex flex-col justify-between overflow-y-auto pr-1">
                      <div className="space-y-6">
                        <div className="flex justify-between items-center pb-3.5 border-b border-slate-200/60">
                          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Audit Report</span>
                          </h3>
                          <button
                            type="button"
                            onClick={() => setAuditResult(null)}
                            className="text-[10px] text-slate-400 hover:text-slate-655 font-bold uppercase transition-colors"
                          >
                            Clear Report
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="text-slate-400 text-[9px] font-bold uppercase">Clarity</div>
                            <div className="text-base font-black text-slate-800 mt-0.5">{auditResult.clarity_score}%</div>
                          </div>
                          <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="text-slate-400 text-[9px] font-bold uppercase">Accuracy</div>
                            <div className="text-base font-black text-slate-800 mt-0.5">{auditResult.accuracy_score}%</div>
                          </div>
                          <div className="p-2 bg-primary-50 rounded-xl border border-primary-100 shadow-sm">
                            <div className="text-primary-655 text-[9px] font-bold uppercase">Overall</div>
                            <div className="text-base font-black text-primary-700 mt-0.5">{auditResult.overall_score}%</div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-[10px] font-black uppercase text-slate-400">Technical Checks</h4>
                          <div className="space-y-2">
                            {auditResult.accuracy_check.map((check, idx) => (
                              <div key={idx} className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-start gap-2 shadow-sm">
                                {check.passed ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                ) : (
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="text-[11px] font-bold text-slate-800 leading-snug">{check.point}</div>
                                  <div className="text-[9px] text-slate-400 leading-normal truncate" title={check.details}>
                                    {check.details}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2 text-xs leading-relaxed">
                          <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                            <span className="font-bold text-slate-800 block text-[9px] uppercase tracking-wider mb-1">Pedagogical Review</span>
                            <span className="text-slate-600">{auditResult.pedagogical_feedback}</span>
                          </div>
                          <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                            <span className="font-bold text-slate-800 block text-[9px] uppercase tracking-wider mb-1">Communication Review</span>
                            <span className="text-slate-600">{auditResult.communication_feedback}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Syllabus Tab */}
              {activeSidebarTab === 'syllabus' && (
                <div className="flex-1 flex flex-col justify-between h-full">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-primary-500" />
                        <span>Syllabus Reference</span>
                      </h3>
                      <p className="text-slate-400 text-xs font-semibold leading-normal mt-1">
                        View the syllabus topics generated for this match course.
                      </p>
                    </div>

                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                      {classes.map((c, idx) => (
                        <div
                          key={c.id}
                          className={`p-3 bg-white border border-slate-255 rounded-xl flex items-start gap-3 shadow-sm ${
                            c.completed_at ? 'bg-primary-50/10 border-primary-100' : ''
                          }`}
                        >
                          {c.completed_at ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0 flex-1">
                            <span className={`text-xs font-bold leading-tight block ${c.completed_at ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                              Session {c.class_number}: {c.title}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Completion Modal Backdrop Overlay */}
        {completingClass && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start">
                <div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-150 rounded text-[9px] font-black uppercase">
                    Class Completion Log
                  </span>
                  <h3 className="text-xl font-black text-slate-900 mt-1">Mark Class {completingClass.class_number} as Completed</h3>
                  <p className="text-xs text-slate-400 font-semibold mt-1">Topic: {completingClass.title}</p>
                </div>
                <button
                  onClick={() => setCompletingClass(null)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Summary Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-750">Class Summary / Recap <span className="text-red-500">*</span></label>
                  <div className="flex gap-2">
                    {auditResult && (
                      <button
                        type="button"
                        onClick={() => {
                          setClassSummary(
                            `AI Auditor Evaluation: Clarity ${auditResult.clarity_score}%, Accuracy ${auditResult.accuracy_score}%. Overall: ${auditResult.overall_score}%. Feedback: ${auditResult.pedagogical_feedback}`
                          );
                        }}
                        className="px-2.5 py-1 bg-indigo-50 border border-indigo-150 text-indigo-700 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer hover:bg-indigo-100 transition-colors"
                      >
                        <Sparkles className="w-3 h-3 text-indigo-600" />
                        <span>Autofill from AI Audit</span>
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={generatingSummary}
                      onClick={handleGenerateAiSummary}
                      className="px-2.5 py-1 bg-emerald-50 border border-emerald-150 text-emerald-700 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                    >
                      {generatingSummary ? (
                        <RefreshCw className="w-3 h-3 animate-spin text-emerald-600" />
                      ) : (
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                      )}
                      <span>Write with AI</span>
                    </button>
                  </div>
                </div>
                <textarea
                  rows="3"
                  value={classSummary}
                  onChange={(e) => setClassSummary(e.target.value)}
                  placeholder="Provide a brief summary of what was taught in this session..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-450 focus:outline-none focus:bg-white focus:border-primary-500/80 resize-none font-medium"
                />
              </div>

              {/* Notes Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-750 block">Technical Notes & Takeaways (Optional)</label>
                <textarea
                  rows="4"
                  value={classNotes}
                  onChange={(e) => setClassNotes(e.target.value)}
                  placeholder="Paste any technical highlights, code snippets, or takeaways for records..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-450 focus:outline-none focus:bg-white focus:border-primary-500/80 resize-none font-mono"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setCompletingClass(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCompleteClassSession}
                  disabled={loading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/10 cursor-pointer disabled:opacity-50"
                >
                  {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save & Complete Class</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Course Lobby View (activeClass is null)
  return (
    <div className="w-full max-w-[1600px] space-y-8 animate-in fade-in duration-200">
      {/* Lobby Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-6 border-b border-slate-200">
        <div className="flex items-start gap-4">
          <button
            onClick={() => {
              setCurrentMatch(null);
              fetchActiveMatches();
            }}
            className="p-2.5 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-850 transition-colors cursor-pointer mt-1"
            title="Back to Auditor Hub"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
          
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-405">Classroom Board Lobby</span>
              {currentMatch.status === 'completed' ? (
                <span className="px-2.5 py-0.5 bg-emerald-50 border border-emerald-150 text-emerald-700 text-[10px] font-black rounded-lg uppercase flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-600" />
                  Course Completed
                </span>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-150 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                  Active Course
                </div>
              )}
              {isTeacher ? (
                <span className="px-2.5 py-0.5 bg-primary-50 border border-primary-200 text-primary-700 text-[10px] font-bold rounded-lg uppercase">Offering Mode</span>
              ) : (
                <span className="px-2.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold rounded-lg uppercase">Learning Mode</span>
              )}
            </div>
            
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mt-1">{currentMatch.skill_title}</h2>
            
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-2 text-slate-550 text-xs font-bold">
              <span>Requested by: {currentMatch.learner_name}</span>
              <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
              <span>Offered by: {currentMatch.teacher_name}</span>
              <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
              <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded text-[10px] font-bold uppercase">{currentMatch.category}</span>
              <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-150 text-indigo-700 rounded text-[10px] font-bold uppercase">{classes.length} Sessions</span>
              <span className="text-[11px] text-slate-500">Timing: {currentMatch.timing}</span>
            </div>
          </div>
        </div>

        {currentMatch.status === 'completed' && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-250 text-emerald-700 px-5 py-3 rounded-xl text-sm font-bold shadow-sm">
            <Check className="w-5 h-5" />
            <span>Course Completed Successfully! Coins transferred.</span>
          </div>
        )}
      </div>

      {/* Progress tracker bar */}
      {classes.length > 0 && (
        <div className="card p-5 bg-white border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex justify-between items-center text-xs font-bold text-slate-800">
            <span className="flex items-center gap-1.5">
              <GraduationCap className="text-primary-500 w-5 h-5" />
              <span>Overall Course Completion Progress</span>
            </span>
            <span>{classes.filter(c => c.completed_at).length} of {classes.length} Classes Done</span>
          </div>
          <div className="w-full bg-slate-150 rounded-full h-3.5 overflow-hidden border border-slate-200/50 flex">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-505"
              style={{ width: `${Math.round((classes.filter(c => c.completed_at).length / classes.length) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Lobby Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left List of Classes (8/12) */}
        <div className="lg:col-span-8 space-y-5">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black text-slate-900">Syllabus Class Progression Checklist</h3>
            <p className="text-slate-450 text-xs font-semibold">Step-by-step locks enforced</p>
          </div>

          {loadingClasses ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-primary-500" />
              <span className="text-sm font-semibold">Loading class schedule...</span>
            </div>
          ) : classes.length > 0 ? (
            <div className="space-y-4">
              {classes.map((c, idx) => {
                const isCompleted = !!c.completed_at;
                const isPreviousCompleted = c.class_number === 1 || classes[c.class_number - 2]?.completed_at;
                const now = new Date();
                const isDateReached = !c.scheduled_at || now >= new Date(c.scheduled_at);
                const isUnlocked = isPreviousCompleted;
                const isLocked = !isUnlocked;
                const isStartable = isUnlocked && isDateReached && !isCompleted;
                const isExpanded = expandedSessionId === c.id;

                return (
                  <div
                    key={c.id}
                    className={`card p-5 border bg-white shadow-sm transition-all duration-200 ${
                      isCompleted
                        ? 'border-emerald-200 bg-emerald-50/5'
                        : isStartable
                        ? 'border-primary-300 ring-2 ring-primary-500/10'
                        : isLocked
                        ? 'border-slate-200 opacity-70 bg-slate-50/50'
                        : 'border-amber-200 bg-amber-50/5'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      {/* Left: Class details */}
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center font-black text-sm border ${
                          isCompleted
                            ? 'bg-emerald-50 border-emerald-250 text-emerald-700'
                            : isStartable
                            ? 'bg-primary-50 border-primary-250 text-primary-700'
                            : isLocked
                            ? 'bg-slate-100 border-slate-200 text-slate-400'
                            : 'bg-amber-50 border-amber-250 text-amber-700'
                        }`}>
                          {c.class_number}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className={`text-base font-bold leading-tight ${isCompleted ? 'text-slate-655 line-through font-semibold' : 'text-slate-900 font-bold'}`}>
                            {c.title}
                          </h4>
                          
                          {/* Schedule / Date Display */}
                          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                            {c.completed_at ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" />
                                <span>Completed on {new Date(c.completed_at).toLocaleDateString()}</span>
                              </span>
                            ) : c.scheduled_at ? (
                              <span className={`font-bold flex items-center gap-1 ${isDateReached ? 'text-primary-750' : 'text-amber-750'}`}>
                                <Calendar className="w-3.5 h-3.5 shrink-0" />
                                <span>Scheduled: {new Date(c.scheduled_at).toLocaleString()}</span>
                                {!isDateReached && (
                                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[9px] font-black uppercase ml-1 tracking-wider">
                                    Future
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-semibold italic flex items-center gap-1">
                                <Info className="w-3.5 h-3.5" />
                                <span>No schedule set (Flexible)</span>
                              </span>
                            )}
                          </div>

                          {/* Scheduling Form Block */}
                          {schedulingClassId === c.id ? (
                            <div className="flex flex-wrap items-center gap-2 mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl max-w-md animate-in fade-in duration-200">
                              <label className="text-[10px] font-black uppercase text-slate-500 block w-full">Set Schedule Date & Time</label>
                              <input
                                type="datetime-local"
                                value={scheduledDateTime}
                                onChange={(e) => setScheduledDateTime(e.target.value)}
                                className="px-2.5 py-1.5 border border-slate-250 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary-500 focus:bg-white"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleSaveSchedule(c.id, scheduledDateTime)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => { setSchedulingClassId(null); setScheduledDateTime(''); }}
                                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-black transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            !isCompleted && isUnlocked && (
                              <button
                                onClick={() => {
                                  setSchedulingClassId(c.id);
                                  setScheduledDateTime(c.scheduled_at ? c.scheduled_at.substring(0, 16) : '');
                                }}
                                className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-655 rounded-lg text-[10px] font-bold flex items-center gap-1 mt-2.5 cursor-pointer transition-colors shadow-sm"
                              >
                                <Calendar className="w-3 h-3 text-slate-500" />
                                <span>{c.scheduled_at ? 'Reschedule' : 'Set Schedule'}</span>
                              </button>
                            )
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="shrink-0 flex items-center gap-2.5 self-center md:self-auto">
                        {isCompleted ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setExpandedSessionId(isExpanded ? null : c.id)}
                              className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-250 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
                            >
                              <span>{isExpanded ? 'Hide Recap' : 'View Recap'}</span>
                            </button>
                            <span className="p-2 bg-emerald-50 text-emerald-650 rounded-xl border border-emerald-100">
                              <CheckCircle2 className="w-5 h-5 animate-in zoom-in-50 duration-300" />
                            </span>
                          </div>
                        ) : isLocked ? (
                          <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 border border-slate-205 text-slate-400 rounded-xl text-xs font-bold">
                            <Lock className="w-4 h-4 text-slate-350" />
                            <span>Locked</span>
                          </div>
                        ) : !isDateReached ? (
                          <div className="flex flex-col items-end gap-1.5">
                            <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-750 rounded-xl text-xs font-bold">
                              <Clock className="w-4 h-4 text-amber-600" />
                              <span>Time Awaiting</span>
                            </div>
                            <span className="text-[9px] text-slate-400 font-bold text-right leading-tight max-w-[150px]">
                              Scheduled in future. Reached the date to unlock call.
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartClass(c)}
                            className="px-5 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-primary-500/10 active:scale-98 flex items-center gap-2 cursor-pointer"
                          >
                            <Play className="w-4 h-4 fill-white text-white" />
                            <span>{isTeacher ? 'Start Class' : 'Join Class'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Collapsible Session Review/Summary details */}
                    {isExpanded && isCompleted && (
                      <div className="border-t border-slate-150 pt-4.5 mt-4.5 space-y-3.5 animate-in slide-in-from-top-2 duration-200">
                        <div className="p-3 bg-slate-50/50 border border-slate-200 rounded-xl space-y-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Class Summary / Recap</span>
                          <p className="text-xs text-slate-700 font-medium leading-relaxed">{c.summary}</p>
                        </div>

                        {c.notes && (
                          <div className="p-3 bg-slate-50/50 border border-slate-200 rounded-xl space-y-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Tutor Notes Taken</span>
                            <pre className="text-[10px] text-slate-655 font-mono bg-white p-2.5 border border-slate-150 rounded-lg overflow-x-auto max-h-[150px] whitespace-pre-wrap">{c.notes}</pre>
                          </div>
                        )}

                        {c.ai_feedback && (() => {
                          try {
                            const feedback = JSON.parse(c.ai_feedback);
                            return (
                              <div className="p-3.5 bg-indigo-50/30 border border-indigo-150 rounded-xl space-y-3">
                                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider block flex items-center gap-1">
                                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                                  AI Auditor Historical Feedback
                                </span>
                                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                  <div className="p-1.5 bg-white border border-slate-200 rounded-lg font-bold">
                                    <div className="text-slate-455 text-[8px] uppercase">Clarity</div>
                                    <div className="text-slate-800 text-sm font-black">{feedback.clarity_score}%</div>
                                  </div>
                                  <div className="p-1.5 bg-white border border-slate-200 rounded-lg font-bold">
                                    <div className="text-slate-455 text-[8px] uppercase">Accuracy</div>
                                    <div className="text-slate-800 text-sm font-black">{feedback.accuracy_score}%</div>
                                  </div>
                                  <div className="p-1.5 bg-primary-50 border border-primary-100 rounded-lg font-bold text-primary-750">
                                    <div className="text-primary-655 text-[8px] uppercase">Overall</div>
                                    <div className="text-primary-700 text-sm font-black">{feedback.overall_score}%</div>
                                  </div>
                                </div>
                                <div className="text-[11px] text-slate-600 font-medium leading-relaxed p-2.5 bg-white border border-slate-150 rounded-lg space-y-2">
                                  <div>
                                    <span className="font-bold text-slate-800 text-[10px] block uppercase text-slate-400 tracking-wider">Structure Review</span>
                                    <span>{feedback.pedagogical_feedback}</span>
                                  </div>
                                  <div>
                                    <span className="font-bold text-slate-805 block uppercase text-slate-400 tracking-wider">Communication Review</span>
                                    <span>{feedback.communication_feedback}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          } catch (e) {
                            return null;
                          }
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card p-12 text-center text-slate-400 font-semibold border-dashed border-slate-255 bg-white">
              No class sessions were generated for this classroom match.
            </div>
          )}
        </div>

        {/* Right Info Sidebar (4/12) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="card p-5 bg-white border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5 flex-wrap">
              <Info className="w-5 h-5 text-indigo-500" />
              <span>Progression Rules</span>
            </h3>
            
            <ul className="space-y-3.5 text-xs text-slate-600 font-medium leading-normal">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 shrink-0 rounded-full bg-slate-100 text-slate-500 font-bold flex items-center justify-center text-[10px]">1</span>
                <div>
                  <strong className="text-slate-850 block">Step-by-Step Locking</strong>
                  Class sessions must be completed sequentially. Class 2 remains locked until Class 1 is completed.
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 shrink-0 rounded-full bg-slate-100 text-slate-500 font-bold flex items-center justify-center text-[10px]">2</span>
                <div>
                  <strong className="text-slate-850 block">Optional Scheduling</strong>
                  Tutors can set date/time schedules. If a date is set, the class cannot start until the scheduled time arrives.
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 shrink-0 rounded-full bg-slate-100 text-slate-500 font-bold flex items-center justify-center text-[10px]">3</span>
                <div>
                  <strong className="text-slate-850 block">Logging Summaries</strong>
                  Completing a class requires a brief summary description, which saves notes and AI audit feedback history.
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 shrink-0 rounded-full bg-slate-100 text-slate-500 font-bold flex items-center justify-center text-[10px]">4</span>
                <div>
                  <strong className="text-slate-850 block">Claiming Coin</strong>
                  When the final class session is marked completed, the system automatically closes the course match and transfers the Skill Coin to the tutor.
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 shrink-0 rounded-full bg-slate-100 text-slate-500 font-bold flex items-center justify-center text-[10px]">5</span>
                <div>
                  <strong className="text-slate-850 block">Videocall Access</strong>
                  Only the Teacher needs to sign in once to Jitsi to open the room. The student joins as a guest immediately with no login required.
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SessionRoom;
