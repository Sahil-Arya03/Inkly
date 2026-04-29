<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Inkly – Task Board</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
    <style>
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

        :root{
            --bg:#f0eef8;
            --sidebar-bg:#ffffff;
            --surface:#ffffff;
            --border:#ebebf0;
            --text:#1a1a2e;
            --text-muted:#9898a8;
            --text-light:#b8b8c8;
            --accent:#7c6af5;
            --accent-light:#ede9fe;
            --green:#22c55e;
            --radius:14px;
            --card-radius:12px;
            --tag-radius:6px;
            --font:'Plus Jakarta Sans',sans-serif;

            /* column accent colors */
            --col-todo:#7c6af5;
            --col-progress:#f59e0b;
            --col-review:#ec4899;
            --col-done:#10b981;
        }

        body{font-family:var(--font);background:var(--bg);color:var(--text);min-height:100vh;display:flex;overflow:hidden;}

        /* ── SIDEBAR ── */
        .sidebar{
            width:200px;min-width:200px;background:var(--sidebar-bg);
            display:flex;flex-direction:column;padding:0;
            border-right:1px solid var(--border);position:relative;z-index:10;
            height:100vh;overflow-y:auto;
        }

        .sidebar-logo{
            display:flex;align-items:center;gap:10px;
            padding:20px 20px 16px;border-bottom:1px solid var(--border);
        }
        .logo-mark{
            width:32px;height:32px;border-radius:10px;
            background:linear-gradient(135deg,#7c6af5,#a78bfa);
            display:flex;align-items:center;justify-content:center;
            color:#fff;font-size:16px;font-weight:700;
        }
        .logo-text{font-size:16px;font-weight:700;color:var(--text);}

        .sidebar-top-action{
            padding:12px 14px 8px;
            display:flex;justify-content:flex-end;
        }
        .sidebar-section{padding:6px 14px 4px;}
        .sidebar-label{font-size:10px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--text-light);padding:10px 6px 4px;}

        .nav-item{
            display:flex;align-items:center;gap:10px;
            padding:8px 10px;border-radius:9px;cursor:pointer;
            font-size:13px;font-weight:500;color:var(--text-muted);
            transition:all .15s;margin:1px 0;position:relative;
        }
        .nav-item:hover{background:var(--bg);color:var(--text);}
        .nav-item.active{background:var(--accent-light);color:var(--accent);}
        .nav-badge{
            margin-left:auto;background:var(--accent);color:#fff;
            font-size:10px;font-weight:700;padding:2px 6px;border-radius:10px;min-width:20px;text-align:center;
        }
        .nav-item.active .nav-badge{background:var(--accent);}

        .sidebar-footer{
            margin-top:auto;border-top:1px solid var(--border);padding:14px;
            display:flex;align-items:center;gap:10px;cursor:pointer;
        }
        .avatar{
            width:32px;height:32px;border-radius:50%;object-fit:cover;
            background:linear-gradient(135deg,#f59e0b,#ef4444);
            display:flex;align-items:center;justify-content:center;
            color:#fff;font-size:12px;font-weight:700;flex-shrink:0;
        }
        .footer-info{flex:1;overflow:hidden;}
        .footer-name{font-size:12px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .footer-email{font-size:10px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}

        /* ── MAIN ── */
        .main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;}

        /* ── TOPBAR ── */
        .topbar{
            background:var(--surface);border-bottom:1px solid var(--border);
            display:flex;align-items:center;gap:16px;padding:0 24px;
            height:60px;flex-shrink:0;
        }
        .topbar-welcome{font-size:13px;color:var(--text-muted);white-space:nowrap;}
        .topbar-welcome strong{display:block;font-size:14px;font-weight:600;color:var(--text);}

        .search-box{
            flex:1;max-width:360px;
            display:flex;align-items:center;gap:8px;
            background:var(--bg);border:1px solid var(--border);border-radius:10px;
            padding:7px 14px;transition:all .2s;
        }
        .search-box:focus-within{border-color:var(--accent);background:#fff;}
        .search-box input{border:none;background:none;outline:none;font-family:var(--font);font-size:13px;color:var(--text);flex:1;}
        .search-box input::placeholder{color:var(--text-muted);}
        .search-kbd{
            font-size:10px;color:var(--text-light);background:#fff;border:1px solid var(--border);
            padding:2px 6px;border-radius:5px;font-family:monospace;white-space:nowrap;
        }

        /* ── BOARD HEADER ── */
        .board-header{
            display:flex;align-items:center;gap:16px;
            padding:18px 24px 14px;flex-shrink:0;
        }
        .board-date{flex:1;}
        .board-title{font-size:20px;font-weight:700;color:var(--text);}
        .board-subtitle{font-size:12px;color:var(--text-muted);margin-top:2px;}

        .board-view-toggle{
            display:flex;align-items:center;gap:6px;
            background:var(--surface);border:1px solid var(--border);
            border-radius:8px;padding:5px 12px;cursor:pointer;
            font-size:13px;font-weight:600;color:var(--text);
        }
        .board-view-toggle span{color:var(--text-muted);font-weight:400;}

        .board-avatars{display:flex;align-items:center;}
        .board-avatar{
            width:28px;height:28px;border-radius:50%;border:2px solid #fff;
            margin-left:-8px;background:linear-gradient(135deg,#7c6af5,#a78bfa);
            display:flex;align-items:center;justify-content:center;
            color:#fff;font-size:9px;font-weight:700;
            flex-shrink:0;
        }
        .board-avatar:first-child{margin-left:0;}

        .btn-filters{
            display:flex;align-items:center;gap:6px;
            background:var(--surface);border:1px solid var(--border);
            border-radius:8px;padding:7px 14px;cursor:pointer;
            font-size:13px;color:var(--text-muted);font-family:var(--font);transition:all .15s;
        }
        .btn-filters:hover{border-color:var(--accent);color:var(--accent);}

        .btn-create{
            display:flex;align-items:center;gap:6px;
            background:var(--accent);border:none;
            border-radius:9px;padding:8px 16px;cursor:pointer;
            font-size:13px;font-weight:600;color:#fff;font-family:var(--font);
            transition:all .15s;box-shadow:0 2px 10px rgba(124,106,245,.3);
        }
        .btn-create:hover{background:#6b59e8;box-shadow:0 4px 16px rgba(124,106,245,.4);}

        /* ── BOARD ── */
        .board-area{flex:1;overflow-x:auto;overflow-y:hidden;padding:0 24px 24px;}
        .board{display:flex;gap:16px;height:100%;min-width:max-content;}

        /* ── COLUMN ── */
        .column{
            width:260px;min-width:260px;display:flex;flex-direction:column;
            background:rgba(255,255,255,.6);border-radius:var(--radius);
            border:1px solid var(--border);overflow:hidden;
            backdrop-filter:blur(8px);
        }

        .col-header{
            display:flex;align-items:center;gap:8px;
            padding:14px 14px 10px;border-bottom:1px solid var(--border);flex-shrink:0;
        }
        .col-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
        .col-name{font-size:13px;font-weight:700;color:var(--text);flex:1;}
        .col-count{
            font-size:11px;font-weight:600;color:var(--text-muted);
            background:var(--bg);padding:2px 7px;border-radius:20px;
        }
        .col-add{
            height:24px;padding:0 8px;border:none;background:none;cursor:pointer;
            border-radius:6px;display:flex;align-items:center;justify-content:center;
            color:var(--text-muted);font-size:11px;font-weight:600;transition:all .15s;
        }
        .col-add:hover{background:var(--bg);color:var(--text);}

        .col-cards{flex:1;overflow-y:auto;padding:10px 10px;display:flex;flex-direction:column;gap:10px;}
        .col-cards::-webkit-scrollbar{width:3px;}
        .col-cards::-webkit-scrollbar-track{background:transparent;}
        .col-cards::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px;}

        /* ── CARD ── */
        .card{
            background:#fff;border:1px solid var(--border);
            border-radius:var(--card-radius);padding:12px;
            cursor:pointer;transition:all .2s cubic-bezier(.22,1,.36,1);
            animation:cardSlide .3s cubic-bezier(.22,1,.36,1) both;
            position:relative;
        }
        @keyframes cardSlide{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.08);border-color:#ddd;}

        .card-tags{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px;}
        .tag{
            font-size:10px;font-weight:600;padding:2px 8px;border-radius:var(--tag-radius);
        }
        .tag-purple{background:#ede9fe;color:#7c3aed;}
        .tag-blue{background:#dbeafe;color:#1d4ed8;}
        .tag-pink{background:#fce7f3;color:#be185d;}
        .tag-orange{background:#ffedd5;color:#c2410c;}
        .tag-green{background:#dcfce7;color:#15803d;}
        .tag-yellow{background:#fef9c3;color:#a16207;}
        .tag-red{background:#fee2e2;color:#b91c1c;}
        .tag-gray{background:#f3f4f6;color:#374151;}

        .card-more{
            position:absolute;top:10px;right:10px;
            height:22px;padding:0 6px;border:none;background:none;cursor:pointer;
            border-radius:5px;display:flex;align-items:center;justify-content:center;
            color:var(--text-light);font-size:11px;font-weight:600;opacity:0;transition:opacity .15s;
        }
        .card:hover .card-more{opacity:1;}

        .card-title{font-size:13px;font-weight:600;color:var(--text);line-height:1.45;margin-bottom:8px;padding-right:48px;}

        /* card image preview */
        .card-img{
            width:100%;height:72px;border-radius:8px;object-fit:cover;
            background:linear-gradient(135deg,#e0e7ff,#f0fdf4);
            margin-bottom:8px;display:flex;align-items:center;justify-content:center;
            font-size:22px;
        }

        /* note row */
        .card-note{
            font-size:11px;color:var(--text-muted);margin-bottom:8px;
            display:flex;align-items:center;gap:4px;
        }

        /* sub tasks */
        .card-subtasks{margin-bottom:8px;}
        .subtask{
            display:flex;align-items:center;gap:6px;
            font-size:11px;color:var(--text-muted);padding:2px 0;
        }
        .subtask-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}

        /* progress */
        .progress-row{display:flex;align-items:center;gap:8px;margin-bottom:10px;}
        .progress-label{font-size:10px;color:var(--text-muted);white-space:nowrap;}
        .progress-bar{flex:1;height:4px;background:var(--bg);border-radius:2px;overflow:hidden;}
        .progress-fill{height:100%;border-radius:2px;transition:width .4s;}
        .progress-pct{font-size:10px;font-weight:600;color:var(--text-muted);white-space:nowrap;}

        /* card footer */
        .card-footer{display:flex;align-items:center;gap:6px;}
        .card-avatars{display:flex;align-items:center;}
        .card-avatar{
            width:22px;height:22px;border-radius:50%;border:1.5px solid #fff;
            margin-left:-6px;background:linear-gradient(135deg,#7c6af5,#a78bfa);
            display:flex;align-items:center;justify-content:center;
            color:#fff;font-size:8px;font-weight:700;flex-shrink:0;
        }
        .card-avatar:first-child{margin-left:0;}
        .card-avatar.orange{background:linear-gradient(135deg,#f59e0b,#ef4444);}
        .card-avatar.green{background:linear-gradient(135deg,#10b981,#22c55e);}
        .card-avatar.pink{background:linear-gradient(135deg,#ec4899,#f43f5e);}
        .card-avatar.blue{background:linear-gradient(135deg,#3b82f6,#6366f1);}

        .card-meta{display:flex;align-items:center;gap:10px;margin-left:auto;}
        .card-stat{display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-muted);}

        /* col todo/progress/review/done accent line */
        .column[data-col="todo"] .col-dot{background:var(--col-todo);}
        .column[data-col="progress"] .col-dot{background:var(--col-progress);}
        .column[data-col="review"] .col-dot{background:var(--col-review);}
        .column[data-col="done"] .col-dot{background:var(--col-done);}
        .column[data-col="done"] .card{background:#f0fdf4;}

        /* ── MODAL ── */
        .overlay{
            display:none;position:fixed;inset:0;background:rgba(0,0,0,.35);
            backdrop-filter:blur(6px);z-index:1000;align-items:center;justify-content:center;
        }
        .overlay.open{display:flex;}
        .modal{
            background:#fff;border-radius:18px;width:440px;max-width:95vw;
            padding:28px;box-shadow:0 24px 80px rgba(0,0,0,.15);
            animation:modalIn .25s cubic-bezier(.22,1,.36,1);
        }
        @keyframes modalIn{from{opacity:0;transform:scale(.93) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}
        .modal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;}
        .modal-title{font-size:17px;font-weight:700;color:var(--text);}
        .modal-close{
            height:30px;padding:0 10px;border:none;background:var(--bg);border-radius:8px;
            cursor:pointer;font-size:12px;font-weight:600;color:var(--text-muted);display:flex;align-items:center;justify-content:center;
        }
        .modal label{display:block;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text-muted);margin-bottom:5px;}
        .modal input,.modal textarea,.modal select{
            width:100%;border:1.5px solid var(--border);border-radius:9px;
            padding:9px 12px;font-family:var(--font);font-size:13px;color:var(--text);
            background:var(--bg);outline:none;margin-bottom:14px;transition:border-color .15s;
        }
        .modal input:focus,.modal textarea:focus,.modal select:focus{border-color:var(--accent);background:#fff;}
        .modal textarea{resize:none;min-height:80px;}
        .modal-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
        .modal-footer{display:flex;gap:10px;justify-content:flex-end;margin-top:4px;}
        .btn-cancel{
            padding:9px 18px;border-radius:9px;border:1px solid var(--border);
            background:none;font-family:var(--font);font-size:13px;color:var(--text-muted);cursor:pointer;
        }
        .btn-save{
            padding:9px 20px;border-radius:9px;border:none;
            background:var(--accent);color:#fff;font-family:var(--font);font-size:13px;font-weight:600;cursor:pointer;
        }

        /* ── SCROLLBAR ── */
        .board-area::-webkit-scrollbar{height:4px;}
        .board-area::-webkit-scrollbar-track{background:transparent;}
        .board-area::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px;}
    </style>
</head>
<body>

<!-- ── SIDEBAR ── -->
<aside class="sidebar">
    <div class="sidebar-logo">
        <div class="logo-mark">I</div>
        <span class="logo-text">inkly</span>
    </div>

    <div class="sidebar-section">
        <div class="nav-item active">
            Tasks
            <span class="nav-badge" id="totalBadge">16</span>
        </div>
        <div class="nav-item">
            Activities
        </div>
    </div>

    <div class="sidebar-section">
        <div class="sidebar-label">Main</div>
        <div class="nav-item">Dashboard</div>
        <div class="nav-item">Schedule</div>
        <div class="nav-item">Note</div>
        <div class="nav-item">Products</div>
        <div class="nav-item">Report</div>
    </div>

    <div class="sidebar-section">
        <div class="sidebar-label">Records</div>
        <div class="nav-item">Team</div>
        <div class="nav-item">Clients</div>
    </div>

    <div class="sidebar-section" style="margin-top:auto;padding-top:0;">
        <div class="nav-item">Settings</div>
        <div class="nav-item">Support</div>
    </div>

    <div class="sidebar-footer">
        <div class="avatar">BS</div>
        <div class="footer-info">
            <div class="footer-name">Brooklyn Simmons</div>
            <div class="footer-email">simmons@jared.com</div>
        </div>
    </div>
</aside>

<!-- ── MAIN ── -->
<div class="main">

    <!-- Topbar -->
    <div class="topbar">
        <div class="topbar-welcome">
            Welcome, <strong>Brooklyn Simmons</strong>
        </div>
        <div class="search-box">
            <input type="text" placeholder="Find something" id="globalSearch" oninput="globalFilter()"/>
            <span class="search-kbd">Ctrl K</span>
        </div>
    </div>

    <!-- Board Header -->
    <div class="board-header">
        <div class="board-date">
            <div class="board-title">May</div>
            <div class="board-subtitle" id="todayDate"></div>
        </div>

        <div class="board-view-toggle">
            Board - Daily Tasks
        </div>

        <div class="board-avatars">
            <div class="board-avatar" style="background:linear-gradient(135deg,#f59e0b,#ef4444)">BS</div>
            <div class="board-avatar" style="background:linear-gradient(135deg,#10b981,#22c55e)">AK</div>
            <div class="board-avatar" style="background:linear-gradient(135deg,#ec4899,#f43f5e)">MJ</div>
            <div class="board-avatar" style="background:linear-gradient(135deg,#3b82f6,#6366f1)">RL</div>
            <div class="board-avatar" style="background:linear-gradient(135deg,#7c6af5,#a78bfa)">+3</div>
        </div>

        <button class="btn-filters">Filters</button>
        <button class="btn-create" onclick="openCreate()">Create task</button>
    </div>

    <!-- Board -->
    <div class="board-area">
        <div class="board" id="board">

            <!-- TODO -->
            <div class="column" data-col="todo">
                <div class="col-header">
                    <div class="col-dot"></div>
                    <span class="col-name">Todo list</span>
                    <span class="col-count" id="count-todo">0</span>
                    <button class="col-add" onclick="openCreate('todo')">Add</button>
                </div>
                <div class="col-cards" id="cards-todo"></div>
            </div>

            <!-- IN PROGRESS -->
            <div class="column" data-col="progress">
                <div class="col-header">
                    <div class="col-dot"></div>
                    <span class="col-name">In Progress</span>
                    <span class="col-count" id="count-progress">0</span>
                    <button class="col-add" onclick="openCreate('progress')">Add</button>
                </div>
                <div class="col-cards" id="cards-progress"></div>
            </div>

            <!-- IN REVIEW -->
            <div class="column" data-col="review">
                <div class="col-header">
                    <div class="col-dot"></div>
                    <span class="col-name">In Review</span>
                    <span class="col-count" id="count-review">0</span>
                    <button class="col-add" onclick="openCreate('review')">Add</button>
                </div>
                <div class="col-cards" id="cards-review"></div>
            </div>

            <!-- DONE -->
            <div class="column" data-col="done">
                <div class="col-header">
                    <div class="col-dot"></div>
                    <span class="col-name">Done</span>
                    <span class="col-count" id="count-done">0</span>
                    <button class="col-add" onclick="openCreate('done')">Add</button>
                </div>
                <div class="col-cards" id="cards-done"></div>
            </div>

        </div>
    </div>
</div>

<!-- ── CREATE MODAL ── -->
<div class="overlay" id="overlay" onclick="closeModal(event)">
    <div class="modal">
        <div class="modal-header">
            <span class="modal-title" id="modalHeading">Create Task</span>
            <button class="modal-close" onclick="closeOverlay()">Close</button>
        </div>

        <label>Task title</label>
        <input type="text" id="newTitle" placeholder="Enter task title…"/>

        <label>Note</label>
        <textarea id="newNote" placeholder="Add a note or description…"></textarea>

        <div class="modal-row">
            <div>
                <label>Column</label>
                <select id="newCol">
                    <option value="todo">Todo list</option>
                    <option value="progress">In Progress</option>
                    <option value="review">In Review</option>
                    <option value="done">Done</option>
                </select>
            </div>
            <div>
                <label>Progress %</label>
                <input type="number" id="newProgress" min="0" max="100" value="0" placeholder="0–100"/>
            </div>
        </div>

        <label>Tags (comma separated)</label>
        <input type="text" id="newTags" placeholder="e.g. #website, #client"/>

        <div class="modal-footer">
            <button class="btn-cancel" onclick="closeOverlay()">Cancel</button>
            <button class="btn-save" onclick="saveTask()">Save Task</button>
        </div>
    </div>
</div>

<script>
    // ── DATA ────────────────────────────────────────────────────────
    const AVATARS = [
        {cls:'orange',label:'BS'},{cls:'green',label:'AK'},
        {cls:'pink',label:'MJ'},{cls:'blue',label:'RL'},{cls:'',label:'NY'}
    ];

    const TAG_COLORS=['tag-purple','tag-blue','tag-pink','tag-orange','tag-green','tag-yellow','tag-red','tag-gray'];

    let tasks = JSON.parse(localStorage.getItem('inkly_tasks') || 'null') || [
        // ── TODO ──
        {id:uid(),col:'todo',title:'Search inspirations for upcoming project',tags:['#website','#talent'],note:'Note: They like the Barhatice project Mike',progress:40,avatars:[0,1,2,3,4],comments:12,files:8},
        {id:uid(),col:'todo',title:'Ginko mobile app design',tags:['#mobile app','#client'],subtasks:['Create user flow','Make wireframe','Design onboarding screens','Make prototype'],note:'Note: We have a meeting 2:34 AM',progress:15,avatars:[0,1,2],comments:7,files:2},
        {id:uid(),col:'todo',title:'Make update of akua mobile banking app',tags:['#mobileup','#client'],progress:30,avatars:[0,1,2,3],comments:12,files:1},
        // ── IN PROGRESS ──
        {id:uid(),col:'progress',title:'Weihu product task and the task process pages',tags:['#dribbble shot','#contact'],hasPreview:true,note:'Have to finish this before weekend',progress:90,avatars:[0,1],comments:6,files:1},
        {id:uid(),col:'progress',title:'Design CRM shop product page responsive website',tags:['#products','#client'],progress:50,avatars:[0,1,2,3],comments:12,files:8},
        // ── IN REVIEW ──
        {id:uid(),col:'review',title:'Cryoto product landing page create in webflow',tags:['#development','#clone'],progress:60,avatars:[0,1,2],comments:12,files:8},
        {id:uid(),col:'review',title:'Natverk video platform web app design and develop',tags:['#product','#client'],progress:45,avatars:[0,1,2],comments:12,files:8},
        {id:uid(),col:'review',title:'Redesign grab website landing and login pages',tags:['#website','#client'],note:'Note: We have a meeting 9:12 AM',progress:70,avatars:[0,1],comments:12,files:8},
        {id:uid(),col:'review',title:'Create Qdiyah app prototype for Got notification in figma',tags:['#mockup','#drop'],progress:55,avatars:[0,1,2,3],comments:12,files:8},
        // ── DONE ──
        {id:uid(),col:'done',title:'Afflito product full service',tags:['#mobile app','#client'],subtasks:['Branding','Mobile app design & development','Landing page design & development','Dashboard design & development','Marketing'],avatars:[0,1],comments:7,files:2},
        {id:uid(),col:'done',title:'Design Moli app product page redesign',tags:['#products','#client'],progress:100,avatars:[0,1,2],comments:13,files:8},
    ];

    // ── HELPERS ─────────────────────────────────────────────────────
    function uid(){return '_'+Math.random().toString(36).slice(2,11);}
    function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
    function persist(){localStorage.setItem('inkly_tasks',JSON.stringify(tasks));}

    function tagColor(tag,i){return TAG_COLORS[i%TAG_COLORS.length];}

    function randomAvatars(count=3){
        const arr=[];
        for(let i=0;i<Math.min(count,AVATARS.length);i++) arr.push(i);
        return arr;
    }

    // ── RENDER ──────────────────────────────────────────────────────
    function renderAll(filter=''){
        ['todo','progress','review','done'].forEach(col=>{
            const container=document.getElementById('cards-'+col);
            const colTasks=tasks.filter(t=>t.col===col&&(
                !filter||t.title.toLowerCase().includes(filter)||
                (t.tags||[]).join(' ').toLowerCase().includes(filter)
            ));
            document.getElementById('count-'+col).textContent=colTasks.length;
            container.innerHTML=colTasks.map((t,idx)=>renderCard(t,idx)).join('');
        });
        // total badge
        document.getElementById('totalBadge').textContent=tasks.length;
    }

    function renderCard(t,delay=0){
        const tags=(t.tags||[]).map((tag,i)=>`<span class="tag ${tagColor(tag,i)}">${esc(tag)}</span>`).join('');

        const avatarHtml=(t.avatars||[]).map(i=>{
            const a=AVATARS[i]||AVATARS[0];
            return `<div class="card-avatar ${a.cls}">${a.label}</div>`;
        }).join('');

        const preview='';

        const subtasksHtml=t.subtasks?`<div class="card-subtasks">${t.subtasks.map((s,i)=>
    `<div class="subtask"><div class="subtask-dot" style="background:${['#7c6af5','#f59e0b','#10b981','#ec4899','#3b82f6'][i%5]}"></div>${esc(s)}</div>`
  ).join('')}</div>`:'';

        const progressHtml=t.progress!=null&&t.progress!==undefined?`
    <div class="progress-row">
      <span class="progress-label">Progress</span>
      <div class="progress-bar"><div class="progress-fill" style="width:${t.progress}%;background:${progressColor(t.col)}"></div></div>
      <span class="progress-pct">${t.progress}%</span>
    </div>`:'';

        const noteHtml=t.note?`<div class="card-note">${esc(t.note)}</div>`:'';

        return `<div class="card" style="animation-delay:${delay*0.04}s" onclick="editCard('${t.id}')">
    <button class="card-more" onclick="event.stopPropagation();deleteCard('${t.id}')">Delete</button>
    ${tags?`<div class="card-tags">${tags}</div>`:''}
    <div class="card-title">${esc(t.title)}</div>
    ${preview}
    ${noteHtml}
    ${subtasksHtml}
    ${progressHtml}
    <div class="card-footer">
      <div class="card-avatars">${avatarHtml}</div>
      <div class="card-meta">
        <span class="card-stat">${t.comments||0} comments</span>
        <span class="card-stat">${t.files||0} files</span>
      </div>
    </div>
  </div>`;
    }

    function progressColor(col){
        return {todo:'#7c6af5',progress:'#f59e0b',review:'#ec4899',done:'#10b981'}[col]||'#7c6af5';
    }

    // ── MODAL ───────────────────────────────────────────────────────
    let editingId=null;

    function openCreate(col='todo'){
        editingId=null;
        document.getElementById('modalHeading').textContent='Create Task';
        document.getElementById('newTitle').value='';
        document.getElementById('newNote').value='';
        document.getElementById('newProgress').value='0';
        document.getElementById('newTags').value='';
        document.getElementById('newCol').value=col;
        document.getElementById('overlay').classList.add('open');
        setTimeout(()=>document.getElementById('newTitle').focus(),60);
    }

    function editCard(id){
        const t=tasks.find(x=>x.id===id);
        if(!t) return;
        editingId=id;
        document.getElementById('modalHeading').textContent='Edit Task';
        document.getElementById('newTitle').value=t.title;
        document.getElementById('newNote').value=t.note||'';
        document.getElementById('newProgress').value=t.progress??'';
        document.getElementById('newTags').value=(t.tags||[]).join(', ');
        document.getElementById('newCol').value=t.col;
        document.getElementById('overlay').classList.add('open');
    }

    function saveTask(){
        const title=document.getElementById('newTitle').value.trim();
        if(!title){document.getElementById('newTitle').style.borderColor='#ef4444';return;}
        document.getElementById('newTitle').style.borderColor='';

        const col=document.getElementById('newCol').value;
        const note=document.getElementById('newNote').value.trim()||undefined;
        const pct=parseInt(document.getElementById('newProgress').value)||0;
        const rawTags=document.getElementById('newTags').value;
        const tags=rawTags.split(',').map(s=>s.trim()).filter(Boolean);

        if(editingId){
            const t=tasks.find(x=>x.id===editingId);
            if(t){Object.assign(t,{title,col,note,progress:pct,tags});}
        } else {
            tasks.unshift({id:uid(),col,title,tags,note,progress:pct,avatars:[0,1,2],comments:0,files:0});
        }
        persist();
        closeOverlay();
        renderAll(document.getElementById('globalSearch').value.toLowerCase());
    }

    function deleteCard(id){
        tasks=tasks.filter(x=>x.id!==id);
        persist();
        renderAll(document.getElementById('globalSearch').value.toLowerCase());
    }

    function closeOverlay(){document.getElementById('overlay').classList.remove('open');editingId=null;}
    function closeModal(e){if(e.target===document.getElementById('overlay'))closeOverlay();}

    // ── SEARCH ──────────────────────────────────────────────────────
    function globalFilter(){
        renderAll(document.getElementById('globalSearch').value.toLowerCase());
    }

    // ── DATE ────────────────────────────────────────────────────────
    function setDate(){
        const d=new Date();
        const opts={weekday:'long',year:'numeric',month:'long',day:'numeric'};
        document.getElementById('todayDate').textContent=
            'Today is '+d.toLocaleDateString('en-US',opts);
    }

    // ── KEYBOARD ────────────────────────────────────────────────────
    document.addEventListener('keydown',e=>{
        if(e.key==='Escape') closeOverlay();
        if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();document.getElementById('globalSearch').focus();}
    });

    // ── INIT ────────────────────────────────────────────────────────
    setDate();
    renderAll();
</script>
</body>
</html>
