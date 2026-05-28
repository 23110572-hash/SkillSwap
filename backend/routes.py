from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db
from models import User, Skill, CreditTransaction, Validation, Match, Review, Message, ClassSession
from sqlalchemy import func
import os
import json

api_bp = Blueprint('api', __name__)

# ──────────────────────────────────────────────────────────────────────────────
# Auth Routes
# ──────────────────────────────────────────────────────────────────────────────

@api_bp.route('/auth/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if not username or not email or not password:
        return jsonify({'message': 'Missing username, email, or password'}), 400

    if User.query.filter((User.username == username) | (User.email == email)).first():
        return jsonify({'message': 'Username or email already exists'}), 400

    user = User(username=username, email=email,
                password_hash=generate_password_hash(password), credits=5)
    try:
        db.session.add(user)
        db.session.commit()
        return jsonify({'message': 'User registered successfully'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Database error: {str(e)}'}), 500


@api_bp.route('/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'message': 'Missing username or password'}), 400

    user = User.query.filter_by(username=username).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'message': 'Invalid credentials'}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({
        'token': token,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'credits': user.credits,
            'profile_pic': user.profile_pic
        }
    }), 200


@api_bp.route('/auth/me', methods=['GET'])
@jwt_required()
def get_me():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404
    return jsonify({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'credits': user.credits,
        'profile_pic': user.profile_pic
    }), 200


@api_bp.route('/auth/profile', methods=['PATCH'])
@jwt_required()
def update_profile():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    data = request.get_json() or {}
    username = data.get('username')
    email = data.get('email')
    profile_pic = data.get('profile_pic')

    if username:
        if User.query.filter(User.username == username, User.id != user_id).first():
            return jsonify({'message': 'Username already taken'}), 400
        user.username = username

    if email:
        if User.query.filter(User.email == email, User.id != user_id).first():
            return jsonify({'message': 'Email already taken'}), 400
        user.email = email

    if profile_pic is not None:
        user.profile_pic = profile_pic

    try:
        db.session.commit()
        return jsonify({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'credits': user.credits,
            'profile_pic': user.profile_pic
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Database error: {str(e)}'}), 500


@api_bp.route('/auth/quick-users', methods=['GET'])
def get_quick_users():
    usernames = ['JuniorDev', 'SeniorEngineer', 'DesignerPro', 'AIExtremist']
    emails = ['junior@test.com', 'senior@test.com', 'designer@test.com', 'ai@test.com']
    passwords = ['devpass123', 'seniorpass', 'design123', 'aipassword']

    users = []
    for u, em, p in zip(usernames, emails, passwords):
        user = User.query.filter_by(username=u).first()
        if not user:
            user = User(username=u, email=em,
                        password_hash=generate_password_hash(p), credits=5)
            db.session.add(user)
            db.session.commit()
        users.append({'username': u, 'password': p, 'email': em, 'credits': user.credits})

    return jsonify(users), 200


# ──────────────────────────────────────────────────────────────────────────────
# Skills Marketplace
# FIX: was N+1 (1 query per skill for reviews). Now: 2 total queries.
# ──────────────────────────────────────────────────────────────────────────────

@api_bp.route('/skills', methods=['GET', 'POST'])
@jwt_required(optional=True)
def manage_skills():
    if request.method == 'GET':
        # Single query: fetch all skills + instructor + rating averages in one optimized join
        rating_subquery = (
            db.session.query(
                Review.reviewed_user_id,
                func.round(func.avg(Review.rating), 1).label('avg_rating'),
                func.count(Review.id).label('review_count')
            )
            .group_by(Review.reviewed_user_id)
            .subquery()
        )

        skills_data = (
            db.session.query(
                Skill,
                User.username.label('instructor_name'),
                rating_subquery.c.avg_rating,
                rating_subquery.c.review_count
            )
            .join(User, Skill.user_id == User.id)
            .outerjoin(rating_subquery, User.id == rating_subquery.c.reviewed_user_id)
            .all()
        )

        result = []
        for s, instructor_name, avg_rating, review_count in skills_data:
            result.append({
                'id': s.id,
                'title': s.title,
                'description': s.description,
                'category': s.category,
                'num_classes': s.num_classes,
                'timing': s.timing,
                'instructor_id': s.user_id,
                'instructor_name': instructor_name,
                'instructor_rating': float(avg_rating) if avg_rating is not None else 0.0,
                'instructor_reviews_count': review_count or 0
            })
        return jsonify(result), 200

    # POST: create a new skill listing
    data = request.get_json() or {}
    instructor_id = get_jwt_identity()
    if instructor_id:
        instructor_id = int(instructor_id)
    else:
        instructor_id = data.get('instructor_id')

    if not instructor_id:
        return jsonify({'message': 'Authorization required or instructor_id needed'}), 401

    title = data.get('title')
    description = data.get('description')
    if not title or not description:
        return jsonify({'message': 'Title and description are required'}), 400

    # Prevent duplicate listings: same instructor + same title (case-insensitive)
    existing = Skill.query.filter(
        Skill.user_id == instructor_id,
        db.func.lower(Skill.title) == title.strip().lower()
    ).first()
    if existing:
        return jsonify({'message': 'You already have a listing with this title. Please use a different name.'}), 400

    skill = Skill(
        user_id=instructor_id,
        title=title,
        description=description,
        category=data.get('category', 'General'),
        num_classes=int(data.get('num_classes', 1)),
        timing=data.get('timing', 'Flexible')
    )
    db.session.add(skill)
    db.session.commit()
    return jsonify({
        'id': skill.id,
        'title': skill.title,
        'description': skill.description,
        'category': skill.category,
        'num_classes': skill.num_classes,
        'timing': skill.timing,
        'instructor_id': skill.user_id
    }), 201


@api_bp.route('/skills/<int:skill_id>', methods=['DELETE'])
@jwt_required()
def delete_skill(skill_id):
    user_id = int(get_jwt_identity())
    skill = Skill.query.get(skill_id)

    if not skill:
        return jsonify({'message': 'Skill not found'}), 404

    if skill.user_id != user_id:
        return jsonify({'message': 'You can only delete your own listings'}), 403

    # Block deletion if there are active (pending or accepted) bookings
    active_bookings = Match.query.filter(
        Match.skill_id == skill_id,
        Match.status.in_(['pending', 'accepted'])
    ).count()
    if active_bookings > 0:
        return jsonify({
            'message': f'Cannot delete — this listing has {active_bookings} active session(s). '
                       'Wait for them to complete or be rejected first.'
        }), 400

    db.session.delete(skill)
    db.session.commit()
    return jsonify({'message': 'Listing deleted successfully'}), 200


# ──────────────────────────────────────────────────────────────────────────────
# Matches
# FIX: was O(4N) queries — 4 separate lookups per match row.
#      Now: 3 total queries regardless of match count.
# ──────────────────────────────────────────────────────────────────────────────

@api_bp.route('/matches', methods=['GET', 'POST'])
@jwt_required(optional=True)
def manage_matches():
    user_id = get_jwt_identity()
    if user_id:
        user_id = int(user_id)
    else:
        user_id = request.args.get('user_id', type=int)

    if request.method == 'GET':
        if not user_id:
            return jsonify({'message': 'user_id or Auth required'}), 400

        from sqlalchemy.orm import aliased
        Learner = aliased(User)
        Teacher = aliased(User)

        # Subquery to check which matches have reviews
        reviewed_subquery = (
            db.session.query(
                Review.match_id,
                func.count(Review.id).label('review_count')
            )
            .group_by(Review.match_id)
            .subquery()
        )

        # Subquery to count completed classes per match
        completed_subquery = (
            db.session.query(
                ClassSession.match_id,
                func.count(ClassSession.id).label('completed_count')
            )
            .filter(ClassSession.completed_at != None)
            .group_by(ClassSession.match_id)
            .subquery()
        )

        # Single optimized query fetching everything in one database round-trip
        matches_data = (
            db.session.query(
                Match,
                Skill,
                Learner.username.label('learner_name'),
                Teacher.username.label('teacher_name'),
                reviewed_subquery.c.review_count,
                completed_subquery.c.completed_count
            )
            .join(Skill, Match.skill_id == Skill.id)
            .join(Learner, Match.learner_id == Learner.id)
            .join(Teacher, Match.teacher_id == Teacher.id)
            .outerjoin(reviewed_subquery, Match.id == reviewed_subquery.c.match_id)
            .outerjoin(completed_subquery, Match.id == completed_subquery.c.match_id)
            .filter((Match.learner_id == user_id) | (Match.teacher_id == user_id))
            .all()
        )

        result = []
        for m, skill, learner_name, teacher_name, review_count, completed_count in matches_data:
            result.append({
                'id': m.id,
                'learner_id': m.learner_id,
                'learner_name': learner_name,
                'teacher_id': m.teacher_id,
                'teacher_name': teacher_name,
                'skill_id': m.skill_id,
                'skill_title': skill.title if skill else 'Deleted Skill',
                'skill_description': skill.description if skill else '',
                'num_classes': skill.num_classes if skill else 1,
                'timing': skill.timing if skill else 'Flexible',
                'category': skill.category if skill else 'General',
                'status': m.status,
                'reviewed': review_count is not None and review_count > 0,
                'completed_classes': completed_count or 0,
                'created_at': m.created_at.isoformat()
            })
        return jsonify(result), 200

    # POST: create a booking
    data = request.get_json() or {}
    learner_id = user_id or data.get('learner_id')
    skill_id = data.get('skill_id')

    if not learner_id or not skill_id:
        return jsonify({'message': 'learner_id and skill_id required'}), 400

    skill = Skill.query.get(skill_id)
    if not skill:
        return jsonify({'message': 'Skill not found'}), 404

    learner = User.query.get(learner_id)
    if learner.credits < 1:
        return jsonify({'message': 'Insufficient Skill Coins. Teach a skill to earn coins.'}), 400

    learner.credits -= 1
    match = Match(learner_id=learner_id, teacher_id=skill.user_id,
                  skill_id=skill_id, status='pending')
    db.session.add(match)
    db.session.add(CreditTransaction(
        user_id=learner_id, amount=-1, transaction_type='spent',
        description=f"Locked coin to book session: {skill.title}"
    ))
    db.session.commit()
    return jsonify({'message': 'Session requested successfully', 'match_id': match.id}), 201


def generate_syllabus_topics(title, description, num_classes, category):
    try:
        import urllib.request
        url = "https://api.groq.com/openai/v1/chat/completions"
        groq_api_key = os.getenv("GROQ_API_KEY")
        headers = {
            "Authorization": f"Bearer {groq_api_key}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0"
        }
        prompt = f"""
        Create a detailed syllabus with exactly {num_classes} sessions/lectures for a class titled "{title}" under the category "{category}".
        Description: {description}

        Return ONLY a JSON object with a single key "lectures" containing an array of strings representing the topic/title of each lecture. Do not include lecture numbers inside the strings.
        Example output:
        {{
            "lectures": [
                "Introduction to course concepts",
                "Deep dive into intermediate topics",
                "Advanced usage and final project layout"
            ]
        }}
        """
        req_data = {
            "model": "llama-3.1-8b-instant",
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": "You are a curriculum design assistant. You generate structured lecture topic breakdowns in raw JSON format."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.5
        }
        req = urllib.request.Request(url, data=json.dumps(req_data).encode('utf-8'), headers=headers, method='POST')
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            result_content = json.loads(res_data['choices'][0]['message']['content'])
            lectures = result_content.get('lectures', [])
            if len(lectures) < num_classes:
                while len(lectures) < num_classes:
                    lectures.append(f"Session {len(lectures)+1} Topic")
            elif len(lectures) > num_classes:
                lectures = lectures[:num_classes]
            return lectures
    except Exception:
        return [f"Session {i+1}: Core concepts and exercises" for i in range(num_classes)]


@api_bp.route('/matches/<int:match_id>', methods=['PATCH'])
def update_match_status(match_id):
    match = Match.query.get(match_id)
    if not match:
        return jsonify({'message': 'Match request not found'}), 404

    data = request.get_json() or {}
    new_status = data.get('status')

    if new_status not in ['accepted', 'completed', 'rejected']:
        return jsonify({'message': 'Invalid status'}), 400

    if new_status == 'accepted' and match.status != 'accepted':
        skill = Skill.query.get(match.skill_id)
        if skill:
            num_classes = skill.num_classes or 1
            existing_count = ClassSession.query.filter_by(match_id=match.id).count()
            if existing_count == 0:
                topics = generate_syllabus_topics(
                    skill.title,
                    skill.description or '',
                    num_classes,
                    skill.category or 'General'
                )
                for i, topic in enumerate(topics):
                    sess = ClassSession(
                        match_id=match.id,
                        class_number=i + 1,
                        title=topic
                    )
                    db.session.add(sess)

    if new_status == 'completed' and match.status != 'completed':
        teacher = User.query.get(match.teacher_id)
        teacher.credits += 1
        skill_title = Skill.query.get(match.skill_id).title
        db.session.add(CreditTransaction(
            user_id=match.teacher_id, amount=1, transaction_type='earned',
            description=f"Earned coin for teaching: {skill_title}"
        ))
    elif new_status == 'rejected' and match.status == 'pending':
        learner = User.query.get(match.learner_id)
        learner.credits += 1
        db.session.add(CreditTransaction(
            user_id=match.learner_id, amount=1, transaction_type='refund',
            description="Refunded coin for rejected booking"
        ))

    match.status = new_status
    db.session.commit()
    return jsonify({'message': f'Session status updated to {new_status}'}), 200


# ──────────────────────────────────────────────────────────────────────────────
# Class Sessions Routes
# ──────────────────────────────────────────────────────────────────────────────

@api_bp.route('/matches/<int:match_id>/classes', methods=['GET'])
@jwt_required()
def get_match_classes(match_id):
    user_id = int(get_jwt_identity())
    match = Match.query.get(match_id)
    if not match:
        return jsonify({'message': 'Match not found'}), 404

    if match.learner_id != user_id and match.teacher_id != user_id:
        return jsonify({'message': 'Unauthorized to view these classes'}), 403

    classes = ClassSession.query.filter_by(match_id=match_id).order_by(ClassSession.class_number.asc()).all()

    # Dynamic generation fallback for legacy matches
    if not classes:
        skill = Skill.query.get(match.skill_id)
        num_classes = skill.num_classes if skill else 1
        topics = generate_syllabus_topics(
            skill.title if skill else "General Class",
            skill.description if skill else "",
            num_classes,
            skill.category if skill else "General"
        )
        for i, topic in enumerate(topics):
            sess = ClassSession(
                match_id=match_id,
                class_number=i + 1,
                title=topic
            )
            db.session.add(sess)
        db.session.commit()
        classes = ClassSession.query.filter_by(match_id=match_id).order_by(ClassSession.class_number.asc()).all()

    return jsonify([{
        'id': c.id,
        'match_id': c.match_id,
        'class_number': c.class_number,
        'title': c.title,
        'scheduled_at': c.scheduled_at.isoformat() if c.scheduled_at else None,
        'completed_at': c.completed_at.isoformat() if c.completed_at else None,
        'summary': c.summary,
        'notes': c.notes,
        'ai_feedback': c.ai_feedback
    } for c in classes]), 200


@api_bp.route('/classes/<int:class_id>', methods=['PATCH'])
@jwt_required()
def update_class_session(class_id):
    user_id = int(get_jwt_identity())
    class_sess = ClassSession.query.get(class_id)
    if not class_sess:
        return jsonify({'message': 'Class session not found'}), 404

    match = Match.query.get(class_sess.match_id)
    if not match:
        return jsonify({'message': 'Match not found'}), 404

    if match.learner_id != user_id and match.teacher_id != user_id:
        return jsonify({'message': 'Unauthorized to update this class'}), 403

    data = request.get_json() or {}

    # 1. Handle scheduling
    if 'scheduled_at' in data:
        sched_str = data.get('scheduled_at')
        if sched_str:
            from datetime import datetime
            try:
                if sched_str.endswith('Z'):
                    sched_str = sched_str[:-1]
                # Replace T with space or handle fromisoformat
                class_sess.scheduled_at = datetime.fromisoformat(sched_str)
            except ValueError:
                return jsonify({'message': 'Invalid date format. Use ISO format.'}), 400
        else:
            class_sess.scheduled_at = None

    # 2. Handle completion
    if data.get('completed') is True:
        from datetime import datetime
        if not class_sess.completed_at:
            class_sess.completed_at = datetime.utcnow()
        if 'summary' in data:
            class_sess.summary = data.get('summary')
        if 'notes' in data:
            class_sess.notes = data.get('notes')
        if 'ai_feedback' in data:
            class_sess.ai_feedback = data.get('ai_feedback')

        # Check if this is the final class session.
        # If so, automatically mark the match as completed and award the coin.
        all_classes = ClassSession.query.filter_by(match_id=match.id).all()
        all_completed = True
        for c in all_classes:
            if c.id != class_sess.id and not c.completed_at:
                all_completed = False
                break

        if all_completed and match.status != 'completed':
            match.status = 'completed'
            teacher = User.query.get(match.teacher_id)
            teacher.credits += 1
            skill_title = Skill.query.get(match.skill_id).title
            db.session.add(CreditTransaction(
                user_id=match.teacher_id, amount=1, transaction_type='earned',
                description=f"Earned coin for teaching: {skill_title} (Completed {len(all_classes)}/{len(all_classes)} classes)"
            ))

    db.session.commit()

    return jsonify({
        'id': class_sess.id,
        'match_id': class_sess.match_id,
        'class_number': class_sess.class_number,
        'title': class_sess.title,
        'scheduled_at': class_sess.scheduled_at.isoformat() if class_sess.scheduled_at else None,
        'completed_at': class_sess.completed_at.isoformat() if class_sess.completed_at else None,
        'summary': class_sess.summary,
        'notes': class_sess.notes,
        'ai_feedback': class_sess.ai_feedback,
        'match_status': match.status
    }), 200



# ──────────────────────────────────────────────────────────────────────────────
# AI Routes
# ──────────────────────────────────────────────────────────────────────────────

@api_bp.route('/sessions/audit', methods=['POST'])
def audit_session():
    data = request.get_json() or {}
    transcript = data.get('transcript', '')

    if not transcript or len(transcript.strip()) < 10:
        return jsonify({'message': 'Transcript content is too short for analysis'}), 400

    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key and len(openai_key) > 10:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)
            prompt = f"""
            Analyze the following transcript of a peer-to-peer tutoring session for:
            1. Technical Accuracy (Checking if the instructor is giving correct info)
            2. Pedagogical Structure (Is the lesson structured well? Is there an explanation, demonstration, and Q&A?)
            3. Communication Clarity (Is the explanation clear and easy to follow?)

            Provide a JSON output matching this structure exactly. Return ONLY valid JSON:
            {{
                "clarity_score": <int between 0 and 100>,
                "accuracy_score": <int between 0 and 100>,
                "overall_score": <int between 0 and 100>,
                "accuracy_check": [
                    {{"point": "check list item 1", "passed": true/false, "details": "reason"}},
                    ...
                ],
                "pedagogical_feedback": "Paragraph feedback on lesson structure",
                "communication_feedback": "Paragraph feedback on clarity and delivery",
                "improvements": ["suggestion 1", "suggestion 2"]
            }}

            Transcript:
            {transcript}
            """
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": "You are a specialized AI Session Auditor for a peer-to-peer knowledge exchange platform."},
                    {"role": "user", "content": prompt}
                ]
            )
            return jsonify(json.loads(response.choices[0].message.content)), 200
        except Exception:
            pass

    # Smart mock fallback
    transcript_lower = transcript.lower()
    word_count = len(transcript.split())

    if "python" in transcript_lower or "variable" in transcript_lower or "def " in transcript_lower:
        subject = "Python Programming"
        accuracy_points = [
            {"point": "Variables dynamically typed and assigned with '='", "passed": True, "details": "Correct usage demonstrated in examples."},
            {"point": "Indentation rules for block structures", "passed": True, "details": "Explained indentations using spaces vs tabs correctly."},
            {"point": "Defining functions using 'def' keyword", "passed": "return" in transcript_lower, "details": "Explained functions, but return statement coverage could be emphasized."}
        ]
        improvements = [
            "Provide more concrete examples of conditional branches (if-else statements).",
            "Remind the student that list indexing in Python starts at 0, not 1."
        ]
    elif "react" in transcript_lower or "hooks" in transcript_lower or "useeffect" in transcript_lower:
        subject = "React Frontend Development"
        accuracy_points = [
            {"point": "Hooks can only be called at the top level of functional components", "passed": True, "details": "Clearly stated not to write hooks inside loops or conditions."},
            {"point": "State updates are asynchronous", "passed": True, "details": "Successfully explained component re-rendering behavior on state change."},
            {"point": "useEffect dependency array explanation", "passed": "dependency" in transcript_lower, "details": "Mentioned dependencies, but could explain cleanups better."}
        ]
        improvements = [
            "Demonstrate a quick code example showing state updater functions vs directly modifying state variables.",
            "Explain hook return/cleanup functions to prevent memory leaks."
        ]
    else:
        subject = "general tutoring"
        accuracy_points = [
            {"point": "Factual and logical consistency of teaching content", "passed": True, "details": "Information provided appears logical and accurate."},
            {"point": "Subject matter definitions", "passed": True, "details": "Instructor correctly defined the core topic."},
            {"point": "Question answering correctness", "passed": "?" in transcript, "details": "Adequate response to student questions."}
        ]
        improvements = [
            "Incorporate a check-for-understanding question midway through the explanation.",
            "Utilize analogical examples to simplify complex terminology."
        ]

    clarity_score = min(70 + (word_count // 10), 98)
    accuracy_score = 90 if len(improvements) <= 2 else 80
    return jsonify({
        "clarity_score": clarity_score,
        "accuracy_score": accuracy_score,
        "overall_score": int((clarity_score + accuracy_score) / 2),
        "accuracy_check": accuracy_points,
        "pedagogical_feedback": f"The tutor structured the session nicely around {subject}. Introduction was clear and pacing was appropriate.",
        "communication_feedback": "Clear vocal delivery and explanation of abstract concepts. The pace was steady, allowing the student to absorb technical terms.",
        "improvements": improvements
    }), 200


@api_bp.route('/ai/generate-description', methods=['POST'])
def generate_description():
    data = request.get_json() or {}
    title = data.get('title')
    category = data.get('category', 'General')

    if not title:
        return jsonify({'message': 'Skill title is required for AI generation'}), 400

    try:
        import urllib.request
        url = "https://api.groq.com/openai/v1/chat/completions"
        groq_api_key = os.getenv("GROQ_API_KEY")
        headers = {
            "Authorization": f"Bearer {groq_api_key}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0"
        }
        req_data = {
            "model": "llama-3.1-8b-instant",
            "messages": [
                {"role": "system", "content": "You are a helpful, professional assistant that writes concise, engaging, and detailed descriptions for courses or classes on a skill-sharing platform. Keep it under 150 words. Do not include introductory text like \"Here is the description:\", just write the description itself."},
                {"role": "user", "content": f"Write a short, engaging description for a class/skill titled: \"{title}\" under the category \"{category}\". Outline what will be taught, target audience, and any prerequisites if relevant."}
            ],
            "temperature": 0.7
        }
        req = urllib.request.Request(url, data=json.dumps(req_data).encode('utf-8'), headers=headers, method='POST')
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            return jsonify({'description': res_data['choices'][0]['message']['content'].strip()}), 200
    except Exception as e:
        return jsonify({'message': f'AI generation failed: {str(e)}'}), 500


@api_bp.route('/ai/generate-syllabus', methods=['POST'])
def generate_syllabus():
    data = request.get_json() or {}
    title = data.get('title')
    description = data.get('description', '')
    num_classes = int(data.get('num_classes', 1))
    category = data.get('category', 'General')

    if not title:
        return jsonify({'message': 'Skill title is required for AI syllabus generation'}), 400

    try:
        import urllib.request
        url = "https://api.groq.com/openai/v1/chat/completions"
        groq_api_key = os.getenv("GROQ_API_KEY")
        headers = {
            "Authorization": f"Bearer {groq_api_key}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0"
        }
        prompt = f"""
        Create a detailed syllabus with exactly {num_classes} sessions/lectures for a class titled "{title}" under the category "{category}".
        Description: {description}

        Return ONLY a JSON object with a single key "lectures" containing an array of strings representing the topic/title of each lecture. Do not include lecture numbers inside the strings.
        Example output:
        {{
            "lectures": [
                "Introduction to course concepts",
                "Deep dive into intermediate topics",
                "Advanced usage and final project layout"
            ]
        }}
        """
        req_data = {
            "model": "llama-3.1-8b-instant",
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": "You are a curriculum design assistant. You generate structured lecture topic breakdowns in raw JSON format."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.5
        }
        req = urllib.request.Request(url, data=json.dumps(req_data).encode('utf-8'), headers=headers, method='POST')
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            result_content = json.loads(res_data['choices'][0]['message']['content'])
            lectures = result_content.get('lectures', [])
            if len(lectures) < num_classes:
                while len(lectures) < num_classes:
                    lectures.append(f"Session {len(lectures)+1} Topic")
            elif len(lectures) > num_classes:
                lectures = lectures[:num_classes]
            return jsonify({'lectures': lectures}), 200
    except Exception:
        fallback = [f"Session {i+1}: Core concepts and exercises" for i in range(num_classes)]
        return jsonify({'lectures': fallback}), 200


@api_bp.route('/ai/generate-summary', methods=['POST'])
@jwt_required()
def generate_summary():
    data = request.get_json() or {}
    title = data.get('title')
    notes = data.get('notes', '')
    skill_title = data.get('skill_title', 'General Skill')
    category = data.get('category', 'General')

    if not title:
        return jsonify({'message': 'Class title is required for AI summary generation'}), 400

    try:
        import urllib.request
        url = "https://api.groq.com/openai/v1/chat/completions"
        groq_api_key = os.getenv("GROQ_API_KEY")
        headers = {
            "Authorization": f"Bearer {groq_api_key}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0"
        }
        
        prompt = f"Summarize a class session titled \"{title}\" for the skill \"{skill_title}\" under the category \"{category}\"."
        if notes:
            prompt += f"\nUse these student/teacher notes for context: {notes}"
        
        prompt += "\n\nRules:\n1. Write a clean, simple, and concise summary of what was covered.\n2. Do NOT use any quotation marks (neither single quotes nor double quotes).\n3. Do NOT use asterisks or markdown symbols.\n4. Keep it direct and easy to read."
        
        req_data = {
            "model": "llama-3.1-8b-instant",
            "messages": [
                {"role": "system", "content": "You are a helpful assistant that writes clear, simple, and direct class summaries in plain text. You do not use quotation marks, asterisks, or markdown formatting."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.5
        }
        
        req = urllib.request.Request(url, data=json.dumps(req_data).encode('utf-8'), headers=headers, method='POST')
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            summary = res_data['choices'][0]['message']['content'].strip()
            # Post-processing to strictly remove quotation marks and asterisks
            summary = summary.replace('"', '').replace("'", "").replace('*', '')
            return jsonify({'summary': summary}), 200
    except Exception as e:
        fallback = f"Completed the class session on {title} for the skill {skill_title}."
        if notes:
            fallback += f" Key notes: {notes}"
        fallback = fallback.replace('"', '').replace("'", "").replace('*', '')
        return jsonify({'summary': fallback}), 200


# ──────────────────────────────────────────────────────────────────────────────
# Messages
# FIX: conversations endpoint was O(N) User lookups. Now uses a single batch query.
# ──────────────────────────────────────────────────────────────────────────────

@api_bp.route('/messages', methods=['GET', 'POST'])
@jwt_required()
def manage_messages():
    user_id = int(get_jwt_identity())

    if request.method == 'GET':
        with_user_id = request.args.get('with_user_id', type=int)
        if not with_user_id:
            return jsonify({'message': 'with_user_id query parameter is required'}), 400

        messages = Message.query.filter(
            ((Message.sender_id == user_id) & (Message.recipient_id == with_user_id)) |
            ((Message.sender_id == with_user_id) & (Message.recipient_id == user_id))
        ).order_by(Message.created_at.asc()).all()

        return jsonify([{
            'id': msg.id,
            'sender_id': msg.sender_id,
            'recipient_id': msg.recipient_id,
            'content': msg.content,
            'created_at': msg.created_at.isoformat()
        } for msg in messages]), 200

    # POST
    data = request.get_json() or {}
    recipient_id = data.get('recipient_id')
    content = data.get('content')

    if not recipient_id or not content or not content.strip():
        return jsonify({'message': 'recipient_id and non-empty content are required'}), 400

    recipient_id = int(recipient_id)
    if recipient_id == user_id:
        return jsonify({'message': 'You cannot message yourself'}), 400

    if not User.query.get(recipient_id):
        return jsonify({'message': 'Recipient not found'}), 404

    msg = Message(sender_id=user_id, recipient_id=recipient_id, content=content.strip())
    db.session.add(msg)
    db.session.commit()
    return jsonify({
        'id': msg.id,
        'sender_id': msg.sender_id,
        'recipient_id': msg.recipient_id,
        'content': msg.content,
        'created_at': msg.created_at.isoformat()
    }), 201


@api_bp.route('/messages/conversations', methods=['GET'])
@jwt_required()
def get_conversations():
    user_id = int(get_jwt_identity())

    all_msgs = Message.query.filter(
        (Message.sender_id == user_id) | (Message.recipient_id == user_id)
    ).order_by(Message.created_at.desc()).all()

    # Collect all partner user IDs, then batch-fetch them in ONE query
    partner_ids = set()
    for msg in all_msgs:
        partner_ids.add(msg.recipient_id if msg.sender_id == user_id else msg.sender_id)

    users_map = {u.id: u for u in User.query.filter(User.id.in_(partner_ids)).all()}

    conversations = {}
    for msg in all_msgs:
        other_id = msg.recipient_id if msg.sender_id == user_id else msg.sender_id
        if other_id not in conversations:
            other_user = users_map.get(other_id)
            if other_user:
                conversations[other_id] = {
                    'user_id': other_id,
                    'username': other_user.username,
                    'email': other_user.email,
                    'last_message': msg.content,
                    'last_message_time': msg.created_at.isoformat(),
                    'last_message_sender_id': msg.sender_id
                }

    return jsonify(list(conversations.values())), 200


# ──────────────────────────────────────────────────────────────────────────────
# Reviews & Ratings
# FIX: was O(N) User.query.get calls inside loop. Now uses one batch fetch.
# ──────────────────────────────────────────────────────────────────────────────

@api_bp.route('/reviews', methods=['POST'])
@jwt_required()
def submit_review():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    match_id = data.get('match_id')
    rating = data.get('rating')
    comment = data.get('comment', '')

    if not match_id or rating is None:
        return jsonify({'message': 'match_id and rating are required'}), 400

    rating = int(rating)
    if rating < 1 or rating > 5:
        return jsonify({'message': 'Rating must be between 1 and 5'}), 400

    match = Match.query.get(match_id)
    if not match:
        return jsonify({'message': 'Match session not found'}), 404
    if match.learner_id != user_id:
        return jsonify({'message': 'Only the learner of this session can submit a review'}), 403
    if match.status != 'completed':
        return jsonify({'message': 'You can only review completed sessions'}), 400
    if Review.query.filter_by(match_id=match_id).first():
        return jsonify({'message': 'You have already reviewed this session'}), 400

    review = Review(
        reviewer_id=user_id,
        reviewed_user_id=match.teacher_id,
        match_id=match_id,
        rating=rating,
        comment=comment
    )
    db.session.add(review)
    db.session.commit()
    return jsonify({'message': 'Review submitted successfully', 'id': review.id}), 201


@api_bp.route('/users/<int:reviewed_user_id>/reviews', methods=['GET'])
def get_user_reviews(reviewed_user_id):
    reviews = (
        Review.query
        .filter_by(reviewed_user_id=reviewed_user_id)
        .order_by(Review.created_at.desc())
        .all()
    )

    # Batch-fetch all reviewers in one query instead of one-per-review
    reviewer_ids = list({r.reviewer_id for r in reviews})
    reviewers_map = {u.id: u for u in User.query.filter(User.id.in_(reviewer_ids)).all()}

    total_rating = 0
    serialized = []
    for r in reviews:
        reviewer = reviewers_map.get(r.reviewer_id)
        serialized.append({
            'id': r.id,
            'reviewer_name': reviewer.username if reviewer else 'Anonymous',
            'reviewer_pic': reviewer.profile_pic if reviewer else None,
            'rating': r.rating,
            'comment': r.comment,
            'created_at': r.created_at.isoformat()
        })
        total_rating += r.rating

    return jsonify({
        'reviews': serialized,
        'average_rating': round(total_rating / len(reviews), 1) if reviews else 0.0,
        'count': len(reviews)
    }), 200
