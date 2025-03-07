// C-Terminal 애플리케이션 JavaScript

// Blockly 및 터미널 환경 초기화
let workspace;
let terminal;
let currentUser = null;
let currentProject = {
    id: null,
    title: '제목 없는 프로젝트',
    blocks: null,
    isPublic: true,
    lastModified: new Date()
};

// 코드 실행 중 상태
let isRunning = false;

// 로컬 스토리지 키
const STORAGE_KEYS = {
    USER: 'c-terminal-user',
    PROJECT: 'c-terminal-current-project',
    PROJECTS: 'c-terminal-projects',
    COMMUNITY_POSTS: 'c-terminal-community-posts'
};

// R2 버킷 관련 설정
const R2_CONFIG = {
    bucketName: 'c-terminaal-storage', // 사용자가 지정한 버킷 이름
    endpoint: '/api', // _worker.js를 통한 API 엔드포인트
    apiKey: 'c-terminaal-api-key' // API 키 (실제 운영 환경에서는 더 강력한 인증 필요)
};

// DOM이 로드된 후 실행
document.addEventListener('DOMContentLoaded', () => {
    // 네비게이션 핸들러 초기화
    initNavigation();
    
    // 로그인 상태 확인
    checkLoginStatus();
    
    // 모달 핸들러 초기화
    initModals();
    
    // 메인 페이지 초기화
    initHomePage();
});

// 네비게이션 핸들러 초기화
function initNavigation() {
    // 각 네비게이션 링크에 이벤트 리스너 추가
    document.getElementById('nav-home').addEventListener('click', (e) => {
        e.preventDefault();
        showSection('home-section');
    });
    
    document.getElementById('nav-playground').addEventListener('click', (e) => {
        e.preventDefault();
        showSection('playground-section');
        
        // Terminal 존재 여부에 관계없이 플레이그라운드 초기화 시도
        setTimeout(() => {
            try {
                initPlayground();
            } catch (error) {
                console.error('플레이그라운드 초기화 오류:', error);
            }
        }, 100);
    });
    
    document.getElementById('nav-community').addEventListener('click', (e) => {
        e.preventDefault();
        showSection('community-section');
        try {
            loadCommunityPosts();
        } catch (error) {
            console.error('커뮤니티 로드 오류:', error);
        }
    });
    
    document.getElementById('nav-explore').addEventListener('click', (e) => {
        e.preventDefault();
        showSection('explore-section');
        try {
            loadExploreProjects();
        } catch (error) {
            console.error('프로젝트 탐색 오류:', error);
        }
    });
    
    // 시작하기 버튼
    document.getElementById('get-started-btn').addEventListener('click', () => {
        showSection('playground-section');
        // Terminal 존재 여부에 관계없이 플레이그라운드 초기화 시도
        setTimeout(() => {
            try {
                initPlayground();
            } catch (error) {
                console.error('플레이그라운드 초기화 오류:', error);
            }
        }, 100);
    });
    
    // 더 알아보기 버튼
    document.getElementById('learn-more-btn').addEventListener('click', () => {
        // 스크롤을 특징 섹션으로 이동
        document.querySelector('.features').scrollIntoView({ behavior: 'smooth' });
    });
    
    // 사용자 드롭다운 메뉴 토글
    const userAvatar = document.getElementById('user-avatar');
    if (userAvatar) {
        userAvatar.addEventListener('click', toggleUserDropdown);
    }
    
    // 프로필 페이지 이동
    document.getElementById('nav-profile').addEventListener('click', (e) => {
        e.preventDefault();
        showSection('profile-section');
        loadUserProfile();
    });
    
    // 로그아웃 버튼
    document.getElementById('logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });
}

// 섹션 표시 함수
function showSection(sectionId) {
    console.log('섹션 전환:', sectionId);
    
    // 모든 섹션 숨기기
    document.querySelectorAll('.section').forEach(section => {
        if (section.style) {
            section.style.display = 'none';
        } else {
            section.setAttribute('style', 'display: none;');
        }
    });
    
    // 선택한 섹션 표시
    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        if (selectedSection.style) {
            selectedSection.style.display = '';
        } else {
            selectedSection.setAttribute('style', 'display: block;');
        }
    } else {
        console.error('섹션을 찾을 수 없음:', sectionId);
    }
    
    // 네비게이션 링크 업데이트
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
    });
    
    // 해당하는 네비게이션 링크 활성화
    const navId = sectionId.replace('-section', '');
    const navLink = document.getElementById(`nav-${navId}`);
    if (navLink) {
        navLink.classList.add('active');
    }
}

// 사용자 드롭다운 토글 함수
function toggleUserDropdown() {
    const dropdown = document.querySelector('.user-dropdown');
    dropdown.classList.toggle('hidden');
    
    // 클릭 외부 영역에서 드롭다운 닫기
    function closeDropdown(e) {
        if (!e.target.closest('.user-menu')) {
            dropdown.classList.add('hidden');
            document.removeEventListener('click', closeDropdown);
        }
    }
    
    // 지연 설정으로 현재 클릭이 닫기 이벤트를 발생시키지 않도록 함
    setTimeout(() => {
        document.addEventListener('click', closeDropdown);
    }, 0);
}

// 로그인 상태 확인 함수
function checkLoginStatus() {
    // 로컬 스토리지에서 사용자 정보 가져오기
    const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
    
    if (savedUser) {
        // 사용자 정보가 있으면 로그인 상태로 설정
        currentUser = JSON.parse(savedUser);
        updateUIForLoggedInUser();
    } else {
        // 로그인되지 않은 상태 UI 업데이트
        updateUIForLoggedOutUser();
    }
}

// 로그인 상태 UI 업데이트
function updateUIForLoggedInUser() {
    // 로그인/회원가입 버튼 숨기기
    document.querySelector('.nav-auth').classList.add('hidden');
    
    // 사용자 메뉴 표시
    document.querySelector('.user-menu').classList.remove('hidden');
    
    // 사용자 아바타 업데이트
    const avatarUrl = currentUser.avatar || 'img/default-avatar.svg';
    document.getElementById('user-avatar').src = avatarUrl;
}

// 로그아웃 상태 UI 업데이트
function updateUIForLoggedOutUser() {
    // 로그인/회원가입 버튼 표시
    document.querySelector('.nav-auth').classList.remove('hidden');
    
    // 사용자 메뉴 숨기기
    document.querySelector('.user-menu').classList.add('hidden');
    
    // 현재 사용자 정보 초기화
    currentUser = null;
}

// 모달 초기화 함수
function initModals() {
    // 모달 열기 버튼 이벤트 리스너
    document.getElementById('login-btn').addEventListener('click', () => openModal('login-modal'));
    document.getElementById('signup-btn').addEventListener('click', () => openModal('signup-modal'));
    
    // 모달 닫기 버튼 이벤트 리스너
    document.querySelectorAll('.close-modal-btn').forEach(btn => {
        btn.addEventListener('click', closeCurrentModal);
    });
    
    // 모달 외부 클릭 시 닫기
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeCurrentModal();
            }
        });
    });
    
    // 로그인/회원가입 전환 이벤트 리스너
    document.getElementById('switch-to-signup').addEventListener('click', (e) => {
        e.preventDefault();
        closeCurrentModal();
        openModal('signup-modal');
    });
    
    document.getElementById('switch-to-login').addEventListener('click', (e) => {
        e.preventDefault();
        closeCurrentModal();
        openModal('login-modal');
    });
    
    // 로그인 제출 이벤트 리스너
    document.getElementById('login-submit-btn').addEventListener('click', handleLogin);
    
    // 회원가입 제출 이벤트 리스너
    document.getElementById('signup-submit-btn').addEventListener('click', handleSignup);
    
    // 공유 모달 관련
    document.getElementById('share-btn').addEventListener('click', () => {
        openShareModal();
    });
    
    document.getElementById('copy-link-btn').addEventListener('click', copyShareLink);
    
    // 프로필 편집 모달 관련
    document.getElementById('edit-profile-btn').addEventListener('click', () => {
        openProfileEditModal();
    });
    
    document.getElementById('save-profile-btn').addEventListener('click', saveProfileChanges);
    
    // 아바타 업로드 관련
    document.getElementById('upload-avatar-btn').addEventListener('click', () => {
        document.getElementById('avatar-upload').click();
    });
    
    document.getElementById('avatar-upload').addEventListener('change', handleAvatarUpload);
    
    // 새 게시물 작성 모달
    document.getElementById('new-post-btn').addEventListener('click', () => {
        openModal('new-post-modal');
    });
    
    document.getElementById('submit-post-btn').addEventListener('click', submitNewPost);
    document.getElementById('cancel-post-btn').addEventListener('click', closeCurrentModal);
}

// 모달 열기 함수
function openModal(modalId) {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
    });
    
    document.getElementById(modalId).classList.remove('hidden');
}

// 현재 모달 닫기 함수
function closeCurrentModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
    });
}

// 로그인 처리 함수
function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    // 간단한 유효성 검사
    if (!email || !password) {
        alert('이메일과 비밀번호를 입력해주세요.');
        return;
    }
    
    // 실제 구현에서는 서버 인증 로직 추가
    // 데모를 위한 간단한 로그인 처리
    simulateLogin(email);
}

// 테스트용 로그인 시뮬레이션
function simulateLogin(email) {
    // 가상의 사용자 정보 생성
    const user = {
        id: 'user_' + Date.now(),
        username: email.split('@')[0],
        email: email,
        avatar: null,
        bio: '',
        joinDate: new Date(),
        projects: [],
        followers: [],
        following: []
    };
    
    // 사용자 정보 저장
    currentUser = user;
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    
    // UI 업데이트
    updateUIForLoggedInUser();
    
    // 모달 닫기
    closeCurrentModal();
    
    // 알림 표시
    alert('로그인되었습니다.');
}

// 회원가입 처리 함수
function handleSignup() {
    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    const termsAgreed = document.getElementById('terms-agree').checked;
    
    // 유효성 검사
    if (!username || !email || !password) {
        alert('모든 필드를 입력해주세요.');
        return;
    }
    
    if (password !== confirmPassword) {
        alert('비밀번호가 일치하지 않습니다.');
        return;
    }
    
    if (!termsAgreed) {
        alert('이용약관에 동의해주세요.');
        return;
    }
    
    // 실제 구현에서는 서버에 회원가입 요청 로직 추가
    // 데모를 위한 간단한 회원가입 처리
    simulateSignup(username, email);
}

// 테스트용 회원가입 시뮬레이션
function simulateSignup(username, email) {
    // 가상의 사용자 정보 생성
    const user = {
        id: 'user_' + Date.now(),
        username: username,
        email: email,
        avatar: null,
        bio: '',
        joinDate: new Date(),
        projects: [],
        followers: [],
        following: []
    };
    
    // 사용자 정보 저장
    currentUser = user;
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    
    // UI 업데이트
    updateUIForLoggedInUser();
    
    // 모달 닫기
    closeCurrentModal();
    
    // 알림 표시
    alert('회원가입이 완료되었습니다.');
}

// 로그아웃 함수
function logout() {
    // 로컬 스토리지에서 사용자 정보 제거
    localStorage.removeItem(STORAGE_KEYS.USER);
    
    // 사용자 정보 초기화
    currentUser = null;
    
    // UI 업데이트
    updateUIForLoggedOutUser();
    
    // 홈 페이지로 이동
    showSection('home-section');
    
    // 드롭다운 닫기
    document.querySelector('.user-dropdown').classList.add('hidden');
}

// 홈 페이지 초기화 함수
function initHomePage() {
    // 홈 페이지 관련 초기화 작업
    // 여기서는 특별한 초기화가 필요 없으므로 비워둡니다.
}

// 플레이그라운드 초기화 함수
function initPlayground() {
    // 이미 초기화된 경우 건너뛰기
    if (workspace && terminal) {
        return;
    }
    
    // 블록 도구 상자 설정
    const toolbox = {
        kind: 'categoryToolbox',
        contents: [
            {
                kind: 'category',
                name: '로직',
                colour: '#5C81A6',
                contents: [
                    {
                        kind: 'block',
                        type: 'controls_if'
                    },
                    {
                        kind: 'block',
                        type: 'controls_repeat_ext'
                    },
                    {
                        kind: 'block',
                        type: 'logic_compare'
                    },
                    {
                        kind: 'block',
                        type: 'logic_operation'
                    },
                    {
                        kind: 'block',
                        type: 'logic_negate'
                    },
                    {
                        kind: 'block',
                        type: 'logic_boolean'
                    },
                    {
                        kind: 'block',
                        type: 'logic_null'
                    },
                    {
                        kind: 'block',
                        type: 'logic_ternary'
                    }
                ]
            },
            {
                kind: 'category',
                name: '반복',
                colour: '#5CA65C',
                contents: [
                    {
                        kind: 'block',
                        type: 'controls_repeat_ext'
                    },
                    {
                        kind: 'block',
                        type: 'controls_whileUntil'
                    },
                    {
                        kind: 'block',
                        type: 'controls_for'
                    },
                    {
                        kind: 'block',
                        type: 'controls_forEach'
                    },
                    {
                        kind: 'block',
                        type: 'controls_flow_statements'
                    }
                ]
            },
            {
                kind: 'category',
                name: '수학',
                colour: '#5CA65C',
                contents: [
                    {
                        kind: 'block',
                        type: 'math_number'
                    },
                    {
                        kind: 'block',
                        type: 'math_arithmetic'
                    },
                    {
                        kind: 'block',
                        type: 'math_single'
                    },
                    {
                        kind: 'block',
                        type: 'math_trig'
                    },
                    {
                        kind: 'block',
                        type: 'math_constant'
                    },
                    {
                        kind: 'block',
                        type: 'math_number_property'
                    },
                    {
                        kind: 'block',
                        type: 'math_round'
                    },
                    {
                        kind: 'block',
                        type: 'math_modulo'
                    },
                    {
                        kind: 'block',
                        type: 'math_constrain'
                    },
                    {
                        kind: 'block',
                        type: 'math_random_int'
                    },
                    {
                        kind: 'block',
                        type: 'math_random_float'
                    }
                ]
            },
            {
                kind: 'category',
                name: '텍스트',
                colour: '#A65CA6',
                contents: [
                    {
                        kind: 'block',
                        type: 'text'
                    },
                    {
                        kind: 'block',
                        type: 'text_join'
                    },
                    {
                        kind: 'block',
                        type: 'text_append'
                    },
                    {
                        kind: 'block',
                        type: 'text_length'
                    },
                    {
                        kind: 'block',
                        type: 'text_isEmpty'
                    },
                    {
                        kind: 'block',
                        type: 'text_indexOf'
                    },
                    {
                        kind: 'block',
                        type: 'text_charAt'
                    },
                    {
                        kind: 'block',
                        type: 'text_getSubstring'
                    },
                    {
                        kind: 'block',
                        type: 'text_changeCase'
                    },
                    {
                        kind: 'block',
                        type: 'text_trim'
                    },
                    {
                        kind: 'block',
                        type: 'text_print'
                    }
                ]
            },
            {
                kind: 'category',
                name: '변수',
                colour: '#A6745C',
                custom: 'VARIABLE'
            },
            {
                kind: 'category',
                name: '함수',
                colour: '#745CA6',
                custom: 'PROCEDURE'
            },
            // 터미널 기본 카테고리
            {
                kind: 'category',
                name: '터미널',
                colour: '#333333',
                contents: [
                    { kind: 'block', type: 'terminal_print' },
                    { kind: 'block', type: 'terminal_print_inline' },
                    { kind: 'block', type: 'terminal_clear' },
                    { kind: 'block', type: 'terminal_input' },
                    { kind: 'block', type: 'terminal_cursor_position' },
                    { kind: 'block', type: 'terminal_wait' }
                ]
            },
            // 텍스트 스타일링 카테고리
            {
                kind: 'category',
                name: '텍스트 스타일',
                colour: '#FF9800',
                contents: [
                    { kind: 'block', type: 'terminal_text_color' },
                    { kind: 'block', type: 'terminal_text_style' }
                ]
            },
            // 고급 출력 카테고리
            {
                kind: 'category',
                name: '고급 출력',
                colour: '#2196F3',
                contents: [
                    { kind: 'block', type: 'terminal_table' },
                    { kind: 'block', type: 'terminal_box' },
                    { kind: 'block', type: 'terminal_notification_box' },
                    { kind: 'block', type: 'terminal_code_highlight' }
                ]
            },
            // 애니메이션 및 효과 카테고리
            {
                kind: 'category',
                name: '애니메이션',
                colour: '#E91E63',
                contents: [
                    { kind: 'block', type: 'terminal_animated_text' },
                    { kind: 'block', type: 'terminal_spinner' },
                    { kind: 'block', type: 'terminal_progress_bar' },
                    { kind: 'block', type: 'terminal_ascii_art' }
                ]
            },
            // 차트 및 그래프 카테고리
            {
                kind: 'category',
                name: '차트/그래프',
                colour: '#00BCD4',
                contents: [
                    { kind: 'block', type: 'terminal_histogram' },
                    { kind: 'block', type: 'terminal_ascii_graph' }
                ]
            },
            // 화면 제어 카테고리
            {
                kind: 'category',
                name: '화면 제어',
                colour: '#9C27B0',
                contents: [
                    { kind: 'block', type: 'terminal_clear_screen' },
                    { kind: 'block', type: 'terminal_split_screen' }
                ]
            },
            // 배열 카테고리
            {
                kind: 'category',
                name: '배열',
                colour: '#A6745C',
                contents: [
                    { kind: 'block', type: 'array_create' },
                    { kind: 'block', type: 'array_get_item' },
                    { kind: 'block', type: 'array_set_item' },
                    { kind: 'block', type: 'array_length' }
                ]
            },
            // 문자열 카테고리
            {
                kind: 'category',
                name: '문자열',
                colour: '#A65CA6',
                contents: [
                    { kind: 'block', type: 'string_concat' },
                    { kind: 'block', type: 'string_substring' },
                    { kind: 'block', type: 'string_split' }
                ]
            },
            // 수학 고급 카테고리
            {
                kind: 'category',
                name: '고급 수학',
                colour: '#5CA65C',
                contents: [
                    { kind: 'block', type: 'math_random_float_advanced' },
                    { kind: 'block', type: 'math_function' }
                ]
            },
            // 시간 카테고리
            {
                kind: 'category',
                name: '시간',
                colour: '#5C81A6',
                contents: [
                    { kind: 'block', type: 'time_current' },
                    { kind: 'block', type: 'terminal_wait' }
                ]
            },
            // 게임 카테고리
            {
                kind: 'category',
                name: '게임',
                colour: '#FF5252',
                contents: [
                    { kind: 'block', type: 'game_difficulty' },
                    { kind: 'block', type: 'game_score' }
                ]
            },
            // 알고리즘 카테고리
            {
                kind: 'category',
                name: '알고리즘',
                colour: '#795548',
                contents: [
                    { kind: 'block', type: 'algorithm_sort_array' },
                    { kind: 'block', type: 'algorithm_search_array' }
                ]
            }
        ]
    };
    
    try {
        // 블록 모양 및 스타일을 변경하는 커스텀 렌더러 생성
        Blockly.blockRendering.ConstantProvider.prototype.CORNER_RADIUS = 25; // 모서리 둥글기 정도 증가
        Blockly.blockRendering.ConstantProvider.prototype.OUTSIDE_CORNER_RADIUS = 25; // 외부 코너도 동일하게 둥글게
        Blockly.blockRendering.ConstantProvider.prototype.NO_PADDING = 0; // 내부 패딩 제거
        Blockly.blockRendering.ConstantProvider.prototype.SHADOW_OFFSET = 0; // 그림자 제거
        Blockly.blockRendering.ConstantProvider.prototype.NOTCH_WIDTH = 20; // 노치 너비 조정
        Blockly.blockRendering.ConstantProvider.prototype.NOTCH_HEIGHT = 15; // 노치 높이 조정
        Blockly.blockRendering.ConstantProvider.prototype.TAB_HEIGHT = 20; // 탭 높이 조정
        Blockly.blockRendering.ConstantProvider.prototype.TAB_RADIUS = 20; // 탭 모서리 둥글기

        // 테두리 두께
        const BORDER_WIDTH = 4; // 테두리 두께 증가

        // 기존 블록 스타일 재정의를 위한 커스텀 렌더러 정의
        class CustomRenderer extends Blockly.blockRendering.Renderer {
        constructor() {
            super();
        }

        // 테두리 스타일 재정의
        makePathObject(constants) {
            const pathObject = super.makePathObject(constants);
            
            // 기존 바로 채우기 동작 대신 채우기 + 테두리 그리기
            const originalDrawSolid = pathObject.drawSolidHighlighted;
            pathObject.drawSolidHighlighted = function(pattern, colour) {
            // 먼저 내부 채우기
            originalDrawSolid.call(this, pattern, colour);
            
            // 테두리 색상 계산 (기본 색상보다 약간 어둡게)
            const darkerColour = Blockly.utils.colour.blend('#000000', colour, 0.3); // 테두리 색상 더 진하게
            
            // 테두리 추가
            this.ctx_.save();
            this.ctx_.strokeStyle = darkerColour;
            this.ctx_.lineWidth = BORDER_WIDTH;
            this.ctx_.lineJoin = 'round';
            this.ctx_.lineCap = 'round';
            this.ctx_.stroke();
            this.ctx_.restore();
            };
            
            return pathObject;
        }

        // 블록 연결 형태 강제 변경
        makeNotch(constants) {
            const notch = super.makeNotch(constants);
            // 여기서 노치(블록 연결부) 모양을 보다 둥글게 수정할 수 있음
            return notch;
        }
        }

        // 커스텀 테마 생성 - 블록 색상을 보다 선명하게 조정
        const customTheme = Blockly.Theme.defineTheme('simpleRounded', {
        'base': Blockly.Themes.Classic,
        'blockStyles': {
            // 각 카테고리별 색상 조정 - 더 밝고 선명하게
            'logic_blocks': { 'colourPrimary': '#6b96c1' },
            'loop_blocks': { 'colourPrimary': '#6bc16b' },
            'math_blocks': { 'colourPrimary': '#5cd65c' },
            'text_blocks': { 'colourPrimary': '#c16bc1' },
            'variable_blocks': { 'colourPrimary': '#c18b6b' },
            'procedure_blocks': { 'colourPrimary': '#8b6bc1' },
            'terminal_blocks': { 'colourPrimary': '#5a5a5a' },
            'styling_blocks': { 'colourPrimary': '#ffad33' },
            'output_blocks': { 'colourPrimary': '#33adff' },
            'animation_blocks': { 'colourPrimary': '#ff3377' },
            'chart_blocks': { 'colourPrimary': '#33ddff' },
            'ui_blocks': { 'colourPrimary': '#b333ff' },
            'list_blocks': { 'colourPrimary': '#c18b6b' },
            'array_blocks': { 'colourPrimary': '#c18b6b' },
            'string_blocks': { 'colourPrimary': '#c16bc1' },
            'time_blocks': { 'colourPrimary': '#6b96c1' },
            'game_blocks': { 'colourPrimary': '#ff6b6b' },
            'algorithm_blocks': { 'colourPrimary': '#8d6e63' }
        },
        'componentStyles': {
            'workspaceBackgroundColour': '#f5f5f5',
            'toolboxBackgroundColour': '#fafafa',
            'toolboxForegroundColour': '#333',
            'flyoutBackgroundColour': '#f0f0f0',
            'flyoutForegroundColour': '#333',
            'flyoutOpacity': 0.9,
            'scrollbarColour': '#bbb',
            'scrollbarOpacity': 0.5
        },
        'fontStyle': {
            'family': 'Arial, sans-serif',
            'weight': 'bold', // 전체 텍스트 볼드 처리
            'size': 11 // 전체 텍스트 크기 조정
          }
        });

        // 커스텀 렌더러 등록
        Blockly.blockRendering.register('custom_renderer', CustomRenderer);
        
        // Blockly 초기화
        workspace = Blockly.inject('blockly-container', {
            toolbox: toolbox,
            scrollbars: true,
            horizontalLayout: false,
            trashcan: true,
            zoom: {
                controls: true,
                wheel: true,
                startScale: 1.0,
                maxScale: 3,
                minScale: 0.3,
                scaleSpeed: 1.2
            },
            grid: {
                spacing: 20,
                length: 3,
                colour: '#ccc',
                snap: true
            },
            theme: customTheme,              // 커스텀 테마 적용
            renderer: 'custom_renderer'      // 커스텀 렌더러 적용
        });
        
        // 저장된 프로젝트 불러오기
        loadCurrentProject();
        
        // 터미널 초기화
        initTerminal();
        
        // 실행 버튼 이벤트 리스너
        document.getElementById('run-btn').addEventListener('click', runCode);
        
        // 저장 버튼 이벤트 리스너
        document.getElementById('save-btn').addEventListener('click', saveProject);
        
        // 프로젝트 제목 변경 이벤트 리스너
        document.getElementById('project-title').addEventListener('change', updateProjectTitle);
        
        // 터미널 지우기 버튼 이벤트 리스너
        document.getElementById('clear-terminal-btn').addEventListener('click', clearTerminal);
        
        // 리사이징 핸들 초기화
        initResizeHandle();
        
        // 브라우저 alert/prompt/confirm 오버라이드
        overrideBrowserDialogs();
        
    } catch (error) {
        console.error('플레이그라운드 초기화 오류:', error);
        const blocklyContainer = document.getElementById('blockly-container');
        if (blocklyContainer) {
            blocklyContainer.innerHTML = '<div style="padding: 20px; color: #333;">Blockly를 초기화할 수 없습니다. 페이지를 새로고침하거나 나중에 다시 시도해주세요.</div>';
        }
    }
}

// 터미널 초기화 함수
function initTerminal() {
    // 먼저 가상 터미널 객체 생성 (항상 기본 제공)
    terminal = {
        // 현재 입력 관련 상태
        inputMode: false,
        inputBuffer: '',
        inputCallback: null,
        cursorVisible: false,
        cursorInterval: null,
        
        // 줄 출력 메서드 (디버그 로그 제거)
        writeln: function(text) {
            // console.log 호출 제거 - 무한 재귀 방지
            const terminalElement = document.getElementById('terminal');
            if (terminalElement) {
                const line = document.createElement('div');
                line.textContent = text;
                line.style.color = 'white';
                line.style.fontFamily = 'monospace';
                line.style.padding = '2px 0';
                terminalElement.appendChild(line);
                
                // 스크롤을 항상 맨 아래로
                terminalElement.scrollTop = terminalElement.scrollHeight;
            }
        },
        
        // 터미널 지우기
        clear: function() {
            const terminalElement = document.getElementById('terminal');
            if (terminalElement) {
                terminalElement.innerHTML = '';
            }
            this.stopInputMode();
        },
        
        // 터미널 열기
        open: function(element) {
            // 디버그 로그 제거
            // 가상 터미널 기본 스타일 적용
            if (element) {
                element.style.backgroundColor = '#1e1e1e';
                element.style.color = '#f8f8f8';
                element.style.padding = '10px';
                element.style.fontFamily = 'monospace';
                element.style.height = '100%';
                element.style.overflowY = 'auto';
                
                // 터미널에 직접 키보드 이벤트 추가
                element.tabIndex = 0; // 포커스 받을 수 있도록
                element.addEventListener('keydown', this.handleKeyDown.bind(this));
                element.addEventListener('focus', () => {
                    if (this.inputMode) {
                        this.startCursorBlink();
                    }
                });
                element.addEventListener('blur', () => {
                    this.stopCursorBlink();
                });
            }
        },
        
        // 사용자 입력 처리 시작
        startInputMode: function(callback) {
            this.inputMode = true;
            this.inputBuffer = '';
            this.inputCallback = callback;
            
            // 입력 라인 생성
            const terminalElement = document.getElementById('terminal');
            if (terminalElement) {
                this.inputLine = document.createElement('div');
                this.inputLine.className = 'terminal-input-line';
                this.inputLine.style.color = 'white';
                this.inputLine.style.fontFamily = 'monospace';
                this.inputLine.style.padding = '2px 0';
                this.inputPrefix = document.createElement('span');
                this.inputPrefix.textContent = '> ';
                this.inputPrefix.style.color = '#339af0';
                
                this.inputText = document.createElement('span');
                this.inputText.textContent = '';
                
                this.cursor = document.createElement('span');
                this.cursor.className = 'terminal-cursor';
                this.cursor.innerHTML = '&nbsp;';
                this.cursor.style.backgroundColor = 'white';
                this.cursor.style.color = 'black';
                
                this.inputLine.appendChild(this.inputPrefix);
                this.inputLine.appendChild(this.inputText);
                this.inputLine.appendChild(this.cursor);
                
                terminalElement.appendChild(this.inputLine);
                terminalElement.scrollTop = terminalElement.scrollHeight;
                
                // 포커스 설정 및 커서 깜박임 시작
                terminalElement.focus();
                this.startCursorBlink();
            }
        },
        
        // 입력 처리 중지
        stopInputMode: function() {
            this.inputMode = false;
            this.stopCursorBlink();
            
            if (this.inputLine) {
                // 입력줄을 일반 텍스트로 변환
                const terminalElement = document.getElementById('terminal');
                const finalText = this.inputLine.textContent;
                this.inputLine = null;
                this.inputPrefix = null;
                this.inputText = null;
                this.cursor = null;
            }
            
            this.inputCallback = null;
            this.inputBuffer = '';
        },
        
        // 키보드 입력 처리
        handleKeyDown: function(e) {
            if (!this.inputMode) return;
            
            // Enter 키 처리
            if (e.key === 'Enter') {
                const result = this.inputBuffer;
                
                // 입력 모드 중지 및 콜백 실행
                this.stopInputMode();
                
                // 줄바꿈을 위한 빈 줄 추가
                this.writeln('');
                
                if (this.inputCallback) {
                    this.inputCallback(result);
                }
                
                e.preventDefault();
                return;
            }
            
            // 백스페이스 처리
            if (e.key === 'Backspace') {
                if (this.inputBuffer.length > 0) {
                    this.inputBuffer = this.inputBuffer.substring(0, this.inputBuffer.length - 1);
                    this.updateInputDisplay();
                }
                e.preventDefault();
                return;
            }
            
            // 일반 문자 입력 처리
            if (e.key.length === 1) {
                this.inputBuffer += e.key;
                this.updateInputDisplay();
                e.preventDefault();
            }
        },
        
        // 입력 표시 업데이트
        updateInputDisplay: function() {
            if (this.inputText) {
                this.inputText.textContent = this.inputBuffer;
            }
        },
        
        // 커서 깜박임 시작
        startCursorBlink: function() {
            this.cursorVisible = true;
            if (this.cursor) {
                this.cursor.style.visibility = 'visible';
            }
            
            // 기존 인터벌 제거
            this.stopCursorBlink();
            
            // 새 인터벌 설정
            this.cursorInterval = setInterval(() => {
                if (!this.cursor) return;
                
                this.cursorVisible = !this.cursorVisible;
                this.cursor.style.visibility = this.cursorVisible ? 'visible' : 'hidden';
            }, 500);
        },
        
        // 커서 깜박임 중지
        stopCursorBlink: function() {
            if (this.cursorInterval) {
                clearInterval(this.cursorInterval);
                this.cursorInterval = null;
            }
            
            if (this.cursor) {
                this.cursor.style.visibility = 'visible';
                this.cursorVisible = true;
            }
        },
        
        // 사용자 입력 받기
        readInput: function(promptText = '') {
            return new Promise((resolve) => {
                if (promptText) {
                    this.writeln(promptText);
                }
                
                this.startInputMode((value) => {
                    resolve(value);
                });
            });
        }
    };
    
    try {
        // Terminal 객체가 존재하는지 확인
        if (typeof window !== 'undefined' && window.Terminal) {
            // 실제 Terminal 객체도 사용 가능하다면 추가 기능 구현
            // (실제 구현에서는 xterm.js와 통합)
        }
    } catch (error) {
        // 터미널 초기화 오류 조용히 처리
    }
    
    // 터미널 열기
    const terminalElement = document.getElementById('terminal');
    if (terminalElement) {
        terminal.open(terminalElement);
        
        // 기본 출력
        terminal.writeln('C-Terminal v1.0');
        terminal.writeln('터미널이 준비되었습니다.');
        terminal.writeln('실행 버튼을 눌러 코드를 실행하세요.');
        terminal.writeln('');
    }
    
    return terminal;
}

// 리사이징 핸들 초기화
function initResizeHandle() {
    const resizeHandle = document.getElementById('resize-handle');
    const blocklyContainer = document.getElementById('blockly-container');
    const terminalContainer = document.querySelector('.terminal-container');
    const playgroundContent = document.querySelector('.playground-content');
    
    if (!resizeHandle || !blocklyContainer || !terminalContainer || !playgroundContent) {
        console.error('리사이징 핸들 초기화 실패: 필요한 요소를 찾을 수 없습니다');
        return;
    }
    
    let isResizing = false;
    let initialX;
    let initialBlocklyWidth;
    let initialTerminalWidth;
    
    // 핸들 위치 초기화
    function updateHandlePosition() {
        const blocklyRect = blocklyContainer.getBoundingClientRect();
        resizeHandle.style.left = `${blocklyRect.width}px`;
    }
    
    // 초기 핸들 위치 설정
    updateHandlePosition();
    
    // 화면 크기 변경 시 핸들 위치 업데이트
    window.addEventListener('resize', updateHandlePosition);
    
    // 마우스 이벤트 핸들러
    resizeHandle.addEventListener('mousedown', startResize);
    
    function startResize(e) {
        isResizing = true;
        initialX = e.clientX;
        initialBlocklyWidth = blocklyContainer.offsetWidth;
        initialTerminalWidth = terminalContainer.offsetWidth;
        
        resizeHandle.classList.add('active');
        
        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);
        
        // 선택 방지
        e.preventDefault();
    }
    
    function resize(e) {
        if (!isResizing) return;
        
        const deltaX = e.clientX - initialX;
        const totalWidth = playgroundContent.offsetWidth;
        
        // 새 너비 계산 (최소 너비 제한)
        const newBlocklyWidth = Math.max(100, Math.min(totalWidth - 100, initialBlocklyWidth + deltaX));
        const newTerminalWidth = totalWidth - newBlocklyWidth - resizeHandle.offsetWidth;
        
        // 너비 적용
        blocklyContainer.style.width = `${newBlocklyWidth}px`;
        blocklyContainer.style.flex = '0 0 auto';
        terminalContainer.style.width = `${newTerminalWidth}px`;
        terminalContainer.style.flex = '0 0 auto';
        
        // 핸들 위치 업데이트
        resizeHandle.style.left = `${newBlocklyWidth}px`;
        
        // Blockly 크기 조정 시 리렌더링
        if (workspace) {
            Blockly.svgResize(workspace);
        }
    }
    
    function stopResize() {
        isResizing = false;
        resizeHandle.classList.remove('active');
        
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResize);
    }
}

// 코드 실행 함수
async function runCode() {
    // 이미 실행 중인 경우 중단
    if (isRunning) {
        return;
    }
    
    // 실행 중 상태로 변경
    isRunning = true;
    document.getElementById('run-btn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> 실행 중...';
    
    // 터미널 지우기
    clearTerminal();
    
    try {
        // Blockly에서 JavaScript 코드 생성
        const code = Blockly.JavaScript.workspaceToCode(workspace);
        
        // 코드 실행 준비 (터미널 출력용 함수 오버라이드)
        const originalConsoleLog = console.log;
        
        // 재귀 방지를 위한 플래그
        let inConsoleOverride = false;
        
        console.log = function() {
            // 재귀 호출 방지
            if (inConsoleOverride) return;
            
            inConsoleOverride = true;
            const args = Array.from(arguments);
            
            if (terminal && terminal.writeln) {
                terminal.writeln(args.join(' '));
            } else {
                originalConsoleLog.apply(console, args);
            }
            
            inConsoleOverride = false;
        };
        
        // 터미널 출력을 위한 process.stdout.write 구현
        if (typeof process === 'undefined' || !process.stdout) {
            window.process = {
                stdout: {
                    write: function(text) {
                        // 특수 제어 문자 처리 (캐리지 리턴 등)
                        if (text.includes('\r')) {
                            // 현재 라인 대체 (캐리지 리턴)
                            const terminalElement = document.getElementById('terminal');
                            if (terminalElement && terminalElement.lastChild) {
                                // 마지막 줄 업데이트
                                const lastLine = terminalElement.lastChild;
                                // \r 이후의 텍스트만 가져오기
                                const newText = text.split('\r').pop();
                                
                                if (newText) {
                                    lastLine.textContent = newText;
                                }
                            } else {
                                // 라인이 없으면 새로 추가
                                if (terminal && terminal.writeln) {
                                    terminal.writeln(text.replace(/\r/g, ''));
                                }
                            }
                        } else {
                            // 일반 텍스트는 그대로 출력
                            if (terminal && terminal.writeln) {
                                terminal.writeln(text);
                            }
                        }
                    },
                    // 가상 콘솔 크기 정보 제공
                    columns: 80,
                    rows: 24
                }
            };
        }
        
        // 안전한 코드 실행을 위한 래퍼 함수
        try {
            // 코드 실행 - 비동기 코드가 있을 수 있으므로 감싸기
            const asyncWrapper = `
                (async function() {
                    ${code}
                })();
            `;
            
            // 코드 실행
            await eval(asyncWrapper);
            
            if (terminal && terminal.writeln) {
                terminal.writeln('\n프로그램이 성공적으로 실행되었습니다.');
            }
        } catch (error) {
            if (terminal && terminal.writeln) {
                terminal.writeln(`\n오류 발생: ${error.message}`);
            } else {
                originalConsoleLog('코드 실행 오류:', error);
            }
        } finally {
            // console.log 복원
            console.log = originalConsoleLog;
        }
    } catch (error) {
        console.error('Blockly 코드 생성 오류:', error);
        // 터미널에 오류 표시
        if (terminal && terminal.writeln) {
            terminal.writeln(`\n오류 발생: Blockly 코드를 생성할 수 없습니다.`);
        }
    } finally {
        // 실행 완료 상태로 변경
        isRunning = false;
        document.getElementById('run-btn').innerHTML = '<i class="fas fa-play"></i> 실행';
    }
}

// 터미널 지우기 함수
function clearTerminal() {
    terminal.clear();
}

// 프로젝트 제목 업데이트 함수
function updateProjectTitle() {
    currentProject.title = document.getElementById('project-title').value;
    updateProjectStatus('변경됨');
}

// 프로젝트 상태 업데이트 함수
function updateProjectStatus(status) {
    document.getElementById('project-status').textContent = status;
}

// 프로젝트 저장 함수
function saveProject() {
    // 프로젝트 데이터 수집
    currentProject.blocks = Blockly.serialization.workspaces.save(workspace);
    currentProject.lastModified = new Date();
    
    // 프로젝트 ID가 없으면 생성
    if (!currentProject.id) {
        currentProject.id = 'project_' + Date.now();
    }
    
    // 로컬 스토리지에 저장
    localStorage.setItem(STORAGE_KEYS.PROJECT, JSON.stringify(currentProject));
    
    // 사용자가 로그인한 경우 프로젝트 목록에 추가
    if (currentUser) {
        // 기존 프로젝트 목록 가져오기
        let userProjects = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS)) || [];
        
        // 이미 있는 프로젝트인지 확인
        const existingIndex = userProjects.findIndex(p => p.id === currentProject.id);
        
        if (existingIndex >= 0) {
            // 기존 프로젝트 업데이트
            userProjects[existingIndex] = currentProject;
        } else {
            // 새 프로젝트 추가
            userProjects.push(currentProject);
        }
        
        // 로컬 스토리지에 프로젝트 목록 저장
        localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(userProjects));
        
        // 실제 구현에서는 여기에 R2 버킷에 저장하는 로직 추가
    }
    
    // 상태 업데이트
    updateProjectStatus('저장됨');
}

// 현재 프로젝트 불러오기 함수
function loadCurrentProject() {
    // 로컬 스토리지에서 프로젝트 불러오기
    const savedProject = localStorage.getItem(STORAGE_KEYS.PROJECT);
    
    if (savedProject) {
        currentProject = JSON.parse(savedProject);
        
        // 프로젝트 제목 설정
        document.getElementById('project-title').value = currentProject.title;
        
        // 블록 불러오기
        if (currentProject.blocks) {
            Blockly.serialization.workspaces.load(currentProject.blocks, workspace);
        }
    }
}

// 터미널 내에서 작동하는 브라우저 대화상자 오버라이드
function overrideBrowserDialogs() {
    // 원본 함수 백업
    const originalAlert = window.alert;
    const originalPrompt = window.prompt;
    const originalConfirm = window.confirm;
    
    // alert 오버라이드 - 입력 받지 않고 메시지만 표시
    window.alert = function(message) {
        if (terminal && terminal.writeln) {
            terminal.writeln('\n[알림] ' + message);
            // 입력 없이 바로 진행
            return Promise.resolve();
        } else {
            return originalAlert(message);
        }
    };
    
    // prompt 오버라이드
    window.prompt = function(message, defaultValue = '') {
        if (terminal && terminal.writeln && terminal.readInput) {
            return terminalPrompt(message, defaultValue);
        } else {
            return originalPrompt(message, defaultValue);
        }
    };
    
    // confirm 오버라이드
    window.confirm = function(message) {
        if (terminal && terminal.writeln && terminal.readInput) {
            return terminalConfirm(message);
        } else {
            return originalConfirm(message);
        }
    };
    
    // 터미널에서 prompt 대화상자 구현
    async function terminalPrompt(message, defaultValue) {
        terminal.writeln('\n[입력] ' + message);
        if (defaultValue) {
            terminal.writeln(`(기본값: ${defaultValue})`);
        }
        
        const value = await terminal.readInput();
        return value || defaultValue;
    }
    
    // 터미널에서 confirm 대화상자 구현
    async function terminalConfirm(message) {
        terminal.writeln('\n[확인] ' + message);
        terminal.writeln('(Y/N 또는 예/아니오로 답변하세요)');
        
        const value = await terminal.readInput();
        const lowerValue = value.toLowerCase();
        return lowerValue === 'y' || lowerValue === 'yes' || lowerValue === '예';
    }
}

// 공유 모달 열기 함수
function openShareModal() {
    // 저장되지 않은 프로젝트라면 먼저 저장
    if (document.getElementById('project-status').textContent !== '저장됨') {
        saveProject();
    }
    
    // 가상의 공유 링크 생성
    const shareLink = `https://c-terminal.pages.dev/projects/${currentProject.id}`;
    document.getElementById('share-link').value = shareLink;
    
    // 공개 설정 체크박스 상태 설정
    document.getElementById('public-project').checked = currentProject.isPublic;
    
    // 모달 열기
    openModal('share-modal');
}

// 공유 링크 복사 함수
function copyShareLink() {
    const shareLink = document.getElementById('share-link');
    shareLink.select();
    document.execCommand('copy');
    
    // 복사 확인 표시
    const copyBtn = document.getElementById('copy-link-btn');
    const originalHtml = copyBtn.innerHTML;
    copyBtn.innerHTML = '<i class="fas fa-check"></i> 복사됨';
    
    // 일정 시간 후 원래 상태로 복원
    setTimeout(() => {
        copyBtn.innerHTML = originalHtml;
    }, 2000);
}

// 사용자 프로필 로드 함수
function loadUserProfile() {
    if (!currentUser) {
        showSection('home-section');
        alert('프로필을 보려면 먼저 로그인하세요.');
        return;
    }
    
    // 프로필 정보 설정
    document.getElementById('profile-username').textContent = currentUser.username;
    document.getElementById('profile-bio').textContent = currentUser.bio || '자기소개가 없습니다.';
    document.getElementById('profile-avatar-img').src = currentUser.avatar || 'img/default-avatar.svg';
    
    // 프로젝트 카운트 설정
    const userProjects = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS)) || [];
    document.getElementById('projects-count').textContent = userProjects.length;
    
    // 팔로워 및 팔로잉 카운트 설정
    document.getElementById('followers-count').textContent = currentUser.followers?.length || 0;
    document.getElementById('following-count').textContent = currentUser.following?.length || 0;
    
    // 사용자 프로젝트 로드
    loadUserProjects();
}

// 사용자 프로젝트 로드 함수
function loadUserProjects() {
    const projectsContainer = document.getElementById('user-projects');
    projectsContainer.innerHTML = ''; // 기존 항목 지우기
    
    // 로컬 스토리지에서 프로젝트 목록 가져오기
    const userProjects = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS)) || [];
    
    if (userProjects.length === 0) {
        projectsContainer.innerHTML = '<p class="empty-message">아직 프로젝트가 없습니다. 플레이그라운드에서 새 프로젝트를 만들어보세요!</p>';
        return;
    }
    
    // 프로젝트 카드 생성
    userProjects.forEach(project => {
        const projectCard = document.createElement('div');
        projectCard.className = 'project-card';
        projectCard.innerHTML = `
            <div class="project-preview">
                <!-- 실제 구현에서는 프로젝트 미리보기 이미지 추가 -->
            </div>
            <div class="project-info-card">
                <h3 class="project-title">${project.title}</h3>
                <p class="project-description">블록 코딩 프로젝트</p>
                <div class="project-meta">
                    <span>수정: ${new Date(project.lastModified).toLocaleDateString()}</span>
                    <span>${project.isPublic ? '공개' : '비공개'}</span>
                </div>
            </div>
        `;
        
        // 프로젝트 카드 클릭 이벤트
        projectCard.addEventListener('click', () => {
            loadProject(project.id);
        });
        
        projectsContainer.appendChild(projectCard);
    });
}

// 특정 프로젝트 로드 함수
function loadProject(projectId) {
    // 프로젝트 목록에서 해당 ID의 프로젝트 찾기
    const userProjects = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS)) || [];
    const project = userProjects.find(p => p.id === projectId);
    
    if (!project) {
        alert('프로젝트를 찾을 수 없습니다.');
        return;
    }
    
    // 현재 프로젝트 설정
    currentProject = project;
    localStorage.setItem(STORAGE_KEYS.PROJECT, JSON.stringify(currentProject));
    
    // 플레이그라운드로 이동
    showSection('playground-section');
    
    // UI 업데이트
    document.getElementById('project-title').value = currentProject.title;
    updateProjectStatus('로드됨');
    
    // 블록 불러오기
    if (currentProject.blocks) {
        // 기존 블록 지우기
        workspace.clear();
        
        // 저장된 블록 불러오기
        Blockly.serialization.workspaces.load(currentProject.blocks, workspace);
    }
}

// 프로필 편집 모달 열기 함수
function openProfileEditModal() {
    if (!currentUser) return;
    
    // 현재 프로필 정보로 필드 채우기
    document.getElementById('edit-username').value = currentUser.username;
    document.getElementById('edit-bio').value = currentUser.bio || '';
    document.getElementById('avatar-preview').src = currentUser.avatar || 'img/default-avatar.svg';
    
    // 모달 열기
    openModal('edit-profile-modal');
}

// 프로필 변경사항 저장 함수
function saveProfileChanges() {
    if (!currentUser) return;
    
    // 입력값 가져오기
    const newUsername = document.getElementById('edit-username').value;
    const newBio = document.getElementById('edit-bio').value;
    
    // 기본 유효성 검사
    if (!newUsername) {
        alert('사용자 이름은 필수입니다.');
        return;
    }
    
    // 사용자 정보 업데이트
    currentUser.username = newUsername;
    currentUser.bio = newBio;
    
    // 로컬 스토리지에 저장
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
    
    // 모달 닫기
    closeCurrentModal();
    
    // 프로필 페이지 새로고침
    loadUserProfile();
    
    // 알림 표시
    alert('프로필이 업데이트되었습니다.');
}

// 아바타 업로드 처리 함수
function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 파일 유형 검사
    if (!file.type.match('image.*')) {
        alert('이미지 파일만 업로드할 수 있습니다.');
        return;
    }
    
    // 파일 크기 검사 (5MB 제한)
    if (file.size > 5 * 1024 * 1024) {
        alert('파일 크기는 5MB 이하여야 합니다.');
        return;
    }
    
    // FileReader를 사용하여 이미지 미리보기
    const reader = new FileReader();
    reader.onload = function(e) {
        // 이미지 미리보기 업데이트
        document.getElementById('avatar-preview').src = e.target.result;
        
        // 실제 구현에서는 여기에 R2 버킷에 업로드하는 로직 추가
        
        // 사용자 아바타 URL 업데이트 (데모용으로 Data URL 사용)
        currentUser.avatar = e.target.result;
    };
    reader.readAsDataURL(file);
}

// 커뮤니티 게시물 로드 함수
function loadCommunityPosts() {
    const postsContainer = document.getElementById('posts-container');
    postsContainer.innerHTML = ''; // 기존 게시물 지우기
    
    // 커뮤니티 탭 이벤트 리스너
    document.querySelectorAll('.community-tabs .tab-btn').forEach(tab => {
        tab.addEventListener('click', () => {
            // 활성 탭 설정
            document.querySelectorAll('.community-tabs .tab-btn').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // 선택한 탭에 따라 다른 정렬 방식으로 게시물 로드
            const tabType = tab.dataset.tab;
            loadPostsByType(tabType);
        });
    });
    
    // 기본적으로 '인기' 탭 게시물 로드
    loadPostsByType('hot');
}

// 탭 유형별 게시물 로드 함수
function loadPostsByType(tabType) {
    const postsContainer = document.getElementById('posts-container');
    postsContainer.innerHTML = ''; // 기존 게시물 지우기
    
    // 로컬 스토리지에서 게시물 가져오기
    let posts = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMMUNITY_POSTS)) || [];
    
    // 탭 유형에 따라 정렬
    switch (tabType) {
        case 'hot':
            // 인기순 (좋아요 수 기준)
            posts.sort((a, b) => (b.likes || 0) - (a.likes || 0));
            break;
        case 'new':
            // 최신순
            posts.sort((a, b) => new Date(b.date) - new Date(a.date));
            break;
        case 'top':
            // 화제순 (댓글 수 기준)
            posts.sort((a, b) => (b.comments?.length || 0) - (a.comments?.length || 0));
            break;
    }
    
    // 게시물이 없는 경우
    if (posts.length === 0) {
        postsContainer.innerHTML = '<p class="empty-message">아직 게시물이 없습니다. 첫 번째 게시물을 작성해보세요!</p>';
        return;
    }
    
    // 게시물 카드 생성
    posts.forEach(post => {
        const postCard = document.createElement('div');
        postCard.className = 'post-card';
        
        // 게시물 내용을 마크다운으로 변환 (링크, 강조 등 지원)
        const postContent = marked.parse(post.content);
        
        postCard.innerHTML = `
            <div class="post-header">
                <div class="post-author">
                    <img src="${post.author.avatar || 'img/default-avatar.svg'}" alt="작성자 아바타" class="post-author-avatar">
                    <span class="post-author-name">${post.author.username}</span>
                </div>
                <span class="post-date">${new Date(post.date).toLocaleDateString()}</span>
            </div>
            <h3 class="post-title">${post.title}</h3>
            <div class="post-content">${postContent}</div>
            ${post.projectId ? `<div class="post-project-link"><a href="#" data-project-id="${post.projectId}">첨부된 프로젝트 보기</a></div>` : ''}
            <div class="post-footer">
                <div class="post-stats">
                    <div class="post-stat">
                        <i class="far fa-thumbs-up"></i>
                        <span>${post.likes || 0}</span>
                    </div>
                    <div class="post-stat">
                        <i class="far fa-comment"></i>
                        <span>${post.comments?.length || 0}</span>
                    </div>
                </div>
                <div class="post-actions">
                    <button class="btn btn-small post-like-btn" data-post-id="${post.id}">
                        <i class="far fa-thumbs-up"></i> 좋아요
                    </button>
                    <button class="btn btn-small post-comment-btn" data-post-id="${post.id}">
                        <i class="far fa-comment"></i> 댓글
                    </button>
                </div>
            </div>
        `;
        
        // 프로젝트 링크 클릭 이벤트
        const projectLink = postCard.querySelector('.post-project-link a');
        if (projectLink) {
            projectLink.addEventListener('click', (e) => {
                e.preventDefault();
                loadProject(projectLink.dataset.projectId);
            });
        }
        
        // 좋아요 버튼 클릭 이벤트
        const likeBtn = postCard.querySelector('.post-like-btn');
        likeBtn.addEventListener('click', () => {
            likePost(post.id);
        });
        
        // 댓글 버튼 클릭 이벤트
        const commentBtn = postCard.querySelector('.post-comment-btn');
        commentBtn.addEventListener('click', () => {
            // 여기에 댓글 기능 구현 (데모에서는 생략)
            alert('댓글 기능은 데모 버전에서 지원하지 않습니다.');
        });
        
        postsContainer.appendChild(postCard);
    });
}

// 게시물 좋아요 함수
function likePost(postId) {
    if (!currentUser) {
        alert('좋아요를 남기려면 로그인이 필요합니다.');
        return;
    }
    
    // 로컬 스토리지에서 게시물 가져오기
    let posts = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMMUNITY_POSTS)) || [];
    
    // 게시물 찾기
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex === -1) return;
    
    // 좋아요 수 증가
    posts[postIndex].likes = (posts[postIndex].likes || 0) + 1;
    
    // 로컬 스토리지에 저장
    localStorage.setItem(STORAGE_KEYS.COMMUNITY_POSTS, JSON.stringify(posts));
    
    // UI 업데이트 (현재 열려있는 탭 유형 확인)
    const activeTab = document.querySelector('.community-tabs .tab-btn.active');
    if (activeTab) {
        loadPostsByType(activeTab.dataset.tab);
    }
}

// 새 게시물 작성 함수
function submitNewPost() {
    if (!currentUser) {
        alert('게시물을 작성하려면 로그인이 필요합니다.');
        closeCurrentModal();
        return;
    }
    
    // 입력값 가져오기
    const title = document.getElementById('post-title').value;
    const content = document.getElementById('post-content').value;
    const attachProject = document.getElementById('attach-project').checked;
    
    // 유효성 검사
    if (!title || !content) {
        alert('제목과 내용은 필수입니다.');
        return;
    }
    
    // 새 게시물 객체 생성
    const newPost = {
        id: 'post_' + Date.now(),
        title: title,
        content: content,
        author: {
            id: currentUser.id,
            username: currentUser.username,
            avatar: currentUser.avatar
        },
        date: new Date(),
        likes: 0,
        comments: [],
        projectId: attachProject ? currentProject.id : null
    };
    
    // 로컬 스토리지에서 기존 게시물 가져오기
    let posts = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMMUNITY_POSTS)) || [];
    
    // 새 게시물 추가
    posts.push(newPost);
    
    // 로컬 스토리지에 저장
    localStorage.setItem(STORAGE_KEYS.COMMUNITY_POSTS, JSON.stringify(posts));
    
    // 모달 닫기
    closeCurrentModal();
    
    // 폼 초기화
    document.getElementById('post-title').value = '';
    document.getElementById('post-content').value = '';
    document.getElementById('attach-project').checked = false;
    
    // 게시물 목록 새로고침
    loadCommunityPosts();
    
    // 알림 표시
    alert('게시물이 성공적으로 작성되었습니다.');
}

// 탐색 페이지 프로젝트 로드 함수
function loadExploreProjects() {
    const projectsContainer = document.getElementById('explore-projects');
    projectsContainer.innerHTML = ''; // 기존 프로젝트 지우기
    
    // 필터 및 검색 이벤트 리스너
    document.getElementById('explore-search-btn').addEventListener('click', filterExploreProjects);
    document.getElementById('category-filter').addEventListener('change', filterExploreProjects);
    document.getElementById('sort-filter').addEventListener('change', filterExploreProjects);
    
    // 예제 프로젝트 데이터 (실제 구현에서는 R2 버킷에서 가져옴)
    const demoProjects = generateDemoProjects();
    
    // 프로젝트 카드 생성
    displayExploreProjects(demoProjects);
}

// 탐색 페이지 프로젝트 필터링 함수
function filterExploreProjects() {
    // 필터 값 가져오기
    const searchTerm = document.getElementById('explore-search').value.toLowerCase();
    const categoryFilter = document.getElementById('category-filter').value;
    const sortFilter = document.getElementById('sort-filter').value;
    
    // 예제 프로젝트 데이터
    let projects = generateDemoProjects();
    
    // 검색어로 필터링
    if (searchTerm) {
        projects = projects.filter(project => 
            project.title.toLowerCase().includes(searchTerm) || 
            project.description.toLowerCase().includes(searchTerm)
        );
    }
    
    // 카테고리로 필터링
    if (categoryFilter !== 'all') {
        projects = projects.filter(project => project.category === categoryFilter);
    }
    
    // 정렬
    switch (sortFilter) {
        case 'popular':
            projects.sort((a, b) => b.likes - a.likes);
            break;
        case 'newest':
            projects.sort((a, b) => new Date(b.date) - new Date(a.date));
            break;
        case 'trending':
            projects.sort((a, b) => b.views - a.views);
            break;
    }
    
    // 필터링된 프로젝트 표시
    displayExploreProjects(projects);
}

// 탐색 페이지 프로젝트 표시 함수
function displayExploreProjects(projects) {
    const projectsContainer = document.getElementById('explore-projects');
    projectsContainer.innerHTML = ''; // 기존 프로젝트 지우기
    
    // 프로젝트가 없는 경우
    if (projects.length === 0) {
        projectsContainer.innerHTML = '<p class="empty-message">검색 결과가 없습니다.</p>';
        return;
    }
    
    // 프로젝트 카드 생성
    projects.forEach(project => {
        const projectCard = document.createElement('div');
        projectCard.className = 'project-card';
        projectCard.innerHTML = `
            <div class="project-preview">
                <!-- 실제 구현에서는 프로젝트 미리보기 이미지 추가 -->
            </div>
            <div class="project-info-card">
                <h3 class="project-title">${project.title}</h3>
                <p class="project-description">${project.description}</p>
                <div class="project-meta">
                    <span>작성자: ${project.author}</span>
                    <span>좋아요: ${project.likes}</span>
                </div>
            </div>
        `;
        
        // 프로젝트 카드 클릭 이벤트 (데모 버전에서는 기능 제한)
        projectCard.addEventListener('click', () => {
            alert('데모 버전에서는 커뮤니티 프로젝트를 열 수 없습니다.');
        });
        
        projectsContainer.appendChild(projectCard);
    });
    
    // 페이지네이션 업데이트
    document.getElementById('page-info').textContent = '1 / 1';
    document.getElementById('prev-page').disabled = true;
    document.getElementById('next-page').disabled = true;
}

// 데모 프로젝트 생성 함수
function generateDemoProjects() {
    return [
        {
            id: 'demo_1',
            title: '숫자 맞추기 게임',
            description: '1부터 100까지의 숫자를 맞추는 간단한 게임입니다.',
            author: 'user123',
            category: 'games',
            date: new Date(2023, 5, 15),
            likes: 42,
            views: 156
        },
        {
            id: 'demo_2',
            title: '도형 그리기 도구',
            description: '다양한 도형을 그리고 조합할 수 있는 도구입니다.',
            author: 'artist98',
            category: 'art',
            date: new Date(2023, 6, 22),
            likes: 31,
            views: 98
        },
        {
            id: 'demo_3',
            title: '간단한 계산기',
            description: '기본적인 사칙연산을 수행하는 계산기입니다.',
            author: 'coder42',
            category: 'tools',
            date: new Date(2023, 7, 5),
            likes: 25,
            views: 87
        },
        {
            id: 'demo_4',
            title: '단어 퀴즈',
            description: '다양한 주제의 단어를 맞추는 퀴즈 게임입니다.',
            author: 'teacher77',
            category: 'education',
            date: new Date(2023, 7, 12),
            likes: 38,
            views: 142
        },
        {
            id: 'demo_5',
            title: '음악 만들기',
            description: '간단한 멜로디를 만들고 재생할 수 있는 프로젝트입니다.',
            author: 'musician55',
            category: 'art',
            date: new Date(2023, 8, 3),
            likes: 47,
            views: 201
        },
        {
            id: 'demo_6',
            title: '미로 찾기',
            description: '자동으로 미로를 생성하고 해결하는 알고리즘 데모입니다.',
            author: 'algo_master',
            category: 'games',
            date: new Date(2023, 8, 18),
            likes: 53,
            views: 189
        }
    ];
}

// 스크립트 로딩을 확인하고 지연 초기화하는 함수
function ensureScriptsLoaded() {
    // XTerm 라이브러리 로딩 확인
    if (typeof Terminal === 'undefined') {
        console.log('XTerm 라이브러리 로딩 중...');
        // 500ms 후에 다시 확인
        setTimeout(ensureScriptsLoaded, 500);
        return;
    }
    
    console.log('모든 스크립트가 로드되었습니다.');
    
    // 네비게이션 페이지 전환 이벤트 추가
    document.getElementById('nav-playground').addEventListener('click', (e) => {
        e.preventDefault();
        showSection('playground-section');
        initPlayground();
    });
    
    document.getElementById('get-started-btn').addEventListener('click', () => {
        showSection('playground-section');
        initPlayground();
    });
}

// 페이지 로드시 스크립트 로딩 확인 함수 호출
window.addEventListener('load', ensureScriptsLoaded);

// R2 버킷 관련 함수들 (실제 구현용)

// 파일 업로드 함수 (Cloudflare R2 연동)
async function uploadToR2(file, path) {
    try {
        // 파일 타입 확인
        const contentType = file.type || 'application/octet-stream';
        
        // API 엔드포인트로 PUT 요청
        const response = await fetch(`${R2_CONFIG.endpoint}/${path}`, {
            method: 'PUT',
            headers: {
                'Content-Type': contentType,
                'Authorization': `Bearer ${R2_CONFIG.apiKey}`,
                'X-Custom-Auth': R2_CONFIG.apiKey
            },
            body: file
        });
        
        // 응답 확인
        if (!response.ok) {
            throw new Error(`업로드 실패: ${response.status} ${response.statusText}`);
        }
        
        console.log(`R2 업로드 성공: ${path}`);
        // 파일 URL 반환
        return `${R2_CONFIG.endpoint}/${path}`;
    } catch (error) {
        console.error('R2 업로드 오류:', error);
        alert(`파일 업로드 중 오류가 발생했습니다: ${error.message}`);
        return null;
    }
}

// 파일 다운로드 함수 (Cloudflare R2 연동)
async function downloadFromR2(path) {
    try {
        // API 엔드포인트로 GET 요청
        const response = await fetch(`${R2_CONFIG.endpoint}/${path}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${R2_CONFIG.apiKey}`,
                'X-Custom-Auth': R2_CONFIG.apiKey
            }
        });
        
        // 응답 확인
        if (!response.ok) {
            throw new Error(`다운로드 실패: ${response.status} ${response.statusText}`);
        }
        
        console.log(`R2 다운로드 성공: ${path}`);
        // 응답 데이터 반환
        return await response.blob();
    } catch (error) {
        console.error('R2 다운로드 오류:', error);
        alert(`파일 다운로드 중 오류가 발생했습니다: ${error.message}`);
        return null;
    }
}

// R2 파일 목록 조회 함수
async function listFilesFromR2(prefix = '') {
    try {
        // API 엔드포인트로 POST 요청 (list 작업)
        const response = await fetch(`${R2_CONFIG.endpoint}/list?prefix=${prefix}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${R2_CONFIG.apiKey}`,
                'X-Custom-Auth': R2_CONFIG.apiKey
            }
        });
        
        // 응답 확인
        if (!response.ok) {
            throw new Error(`목록 조회 실패: ${response.status} ${response.statusText}`);
        }
        
        // 파일 목록 데이터 반환
        const data = await response.json();
        console.log(`R2 파일 목록 조회 성공: ${prefix}`, data);
        return data;
    } catch (error) {
        console.error('R2 파일 목록 조회 오류:', error);
        alert(`파일 목록 조회 중 오류가 발생했습니다: ${error.message}`);
        return { objects: [], delimitedPrefixes: [] };
    }
}

// 기존 app.js 파일에 추가해야 하는 코드

// 기존 DOM 로드 이벤트 리스너를 수정
document.addEventListener('DOMContentLoaded', () => {
    // 기존 초기화 코드는 유지하되, 인증 시스템을 통합
    
    // 네비게이션 핸들러 초기화
    initNavigation();
    
    // 인증 시스템 초기화 (기존 checkLoginStatus 대신 사용)
    authManager.init();
    
    // 모달 핸들러 초기화 (기존 코드)
    initModals();
    
    // 프로젝트 관리자 초기화
    projectManager.init();
    
    // 메인 페이지 초기화
    initHomePage();
    
    // 인증 상태에 따른 UI 업데이트
    if (authManager.isLoggedIn()) {
        uiHandlers.updateUIForLoggedInUser();
    } else {
        uiHandlers.updateUIForLoggedOutUser();
    }
    
    // 커뮤니티 페이지 이벤트 리스너
    document.getElementById('nav-community').addEventListener('click', () => {
        if (document.getElementById('community-section').style.display !== 'none') {
            // 커뮤니티 게시물 로드
            uiHandlers.loadCommunityPosts('hot');
        }
    });
    
    // 프로필 페이지 이벤트 리스너
    document.getElementById('nav-profile').addEventListener('click', () => {
        uiHandlers.loadUserProfile();
    });
    
    // 이미 작성된 함수들과 연결
    
    // 1. 로그인/회원가입 함수 연결
    document.getElementById('login-submit-btn').addEventListener('click', function() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        const result = authManager.login(email, password);
        
        if (result.success) {
            uiHandlers.updateUIForLoggedInUser();
            closeCurrentModal();
            alert('로그인되었습니다.');
        } else {
            alert(result.message);
        }
    });
    
    document.getElementById('signup-submit-btn').addEventListener('click', function() {
        const username = document.getElementById('signup-username').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;
        const termsAgreed = document.getElementById('terms-agree').checked;
        
        // 비밀번호 일치 확인
        if (password !== confirmPassword) {
            alert('비밀번호가 일치하지 않습니다.');
            return;
        }
        
        // 약관 동의 확인
        if (!termsAgreed) {
            alert('이용약관에 동의해주세요.');
            return;
        }
        
        const result = authManager.register(username, email, password);
        
        if (result.success) {
            uiHandlers.updateUIForLoggedInUser();
            closeCurrentModal();
            alert('회원가입이 완료되었습니다.');
        } else {
            alert(result.message);
        }
    });
    
    // 2. 로그아웃 함수 연결
    document.getElementById('logout-btn').addEventListener('click', function() {
        authManager.logout();
        uiHandlers.updateUIForLoggedOutUser();
        showSection('home-section');
        document.querySelector('.user-dropdown').classList.add('hidden');
    });
    
    // 3. 프로젝트 저장 버튼 연결
    document.getElementById('save-btn').addEventListener('click', function() {
        if (!window.workspace) {
            alert('코드 편집기가 초기화되지 않았습니다.');
            return;
        }
        
        const blocks = Blockly.serialization.workspaces.save(workspace);
        const result = projectManager.saveCurrentProject(blocks);
        
        if (result.success) {
            document.getElementById('project-status').textContent = '저장됨';
            alert('프로젝트가 저장되었습니다.');
        } else {
            alert(result.message);
        }
    });
    
    // 4. 프로젝트 제목 변경 연결
    document.getElementById('project-title').addEventListener('change', function() {
        const title = this.value;
        const result = projectManager.updateTitle(title);
        
        if (result.success) {
            document.getElementById('project-status').textContent = '변경됨';
        }
    });
    
    // 5. 공유 기능 연결
    document.getElementById('share-btn').addEventListener('click', function() {
        // 저장되지 않은 프로젝트라면 먼저 저장
        if (document.getElementById('project-status').textContent !== '저장됨') {
            document.getElementById('save-btn').click();
        }
        
        const currentProject = projectManager.currentProject;
        
        // 공유 링크 생성
        const shareLink = `https://c-terminal.pages.dev/projects/${currentProject.id}`;
        document.getElementById('share-link').value = shareLink;
        
        // 공개 설정 체크박스 상태 설정
        document.getElementById('public-project').checked = currentProject.isPublic;
        
        // 모달 열기
        openModal('share-modal');
    });
    
    // 6. 공유 링크 복사 기능
    document.getElementById('copy-link-btn').addEventListener('click', function() {
        const shareLink = document.getElementById('share-link');
        shareLink.select();
        document.execCommand('copy');
        
        const copyBtn = document.getElementById('copy-link-btn');
        const originalHtml = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check"></i> 복사됨';
        
        setTimeout(() => {
            copyBtn.innerHTML = originalHtml;
        }, 2000);
    });
    
    // 7. 공개 설정 변경 연결
    document.getElementById('public-project').addEventListener('change', function() {
        const isPublic = this.checked;
        projectManager.togglePublic(isPublic);
    });
    
    // 8. 게시물 작성 기능 연결
    document.getElementById('submit-post-btn').addEventListener('click', function() {
        const title = document.getElementById('post-title').value;
        const content = document.getElementById('post-content').value;
        const attachProject = document.getElementById('attach-project').checked;
        
        // 프로젝트 첨부 확인
        const projectId = attachProject ? projectManager.currentProject.id : null;
        
        const result = communityManager.createPost(title, content, projectId);
        
        if (result.success) {
            closeCurrentModal();
            
            // 폼 초기화
            document.getElementById('post-title').value = '';
            document.getElementById('post-content').value = '';
            document.getElementById('attach-project').checked = false;
            
            // 게시물 목록 새로고침
            uiHandlers.loadCommunityPosts('new');
            
            alert('게시물이 성공적으로 작성되었습니다.');
        } else {
            alert(result.message);
        }
    });
    
    // 9. 커뮤니티 탭 이벤트 리스너
    document.querySelectorAll('.community-tabs .tab-btn').forEach(tab => {
        tab.addEventListener('click', () => {
            // 활성 탭 설정
            document.querySelectorAll('.community-tabs .tab-btn').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // 선택한 탭에 따라 게시물 로드
            const tabType = tab.dataset.tab;
            uiHandlers.loadCommunityPosts(tabType);
        });
    });
    
    // 10. 탐색 페이지 필터링 및 정렬
    document.getElementById('explore-search-btn').addEventListener('click', function() {
        filterExploreProjects();
    });
    
    document.getElementById('category-filter').addEventListener('change', function() {
        filterExploreProjects();
    });
    
    document.getElementById('sort-filter').addEventListener('change', function() {
        filterExploreProjects();
    });
    
    // 탐색 페이지 필터링 함수 오버라이드
    window.filterExploreProjects = function() {
        const searchTerm = document.getElementById('explore-search').value.toLowerCase();
        const categoryFilter = document.getElementById('category-filter').value;
        const sortFilter = document.getElementById('sort-filter').value;
        
        // 공개 프로젝트 가져오기
        const result = projectManager.getPublicProjects(sortFilter);
        
        if (!result.success) {
            alert('프로젝트를 불러오는 중 오류가 발생했습니다.');
            return;
        }
        
        let projects = result.projects;
        
        // 검색어 필터링
        if (searchTerm) {
            projects = projects.filter(project => 
                project.title.toLowerCase().includes(searchTerm)
            );
        }
        
        // 카테고리 필터링 (카테고리 정보가 있다면)
        if (categoryFilter !== 'all' && projects[0].category) {
            projects = projects.filter(project => project.category === categoryFilter);
        }
        
        // 필터링된 프로젝트 표시
        displayExploreProjects(projects);
    };
});

// 기존 모달 열기 함수 수정 (display: flex로 변경)
function openModal(modalId) {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex'; // 'none'에서 'flex'로 변경
    }
}

// 기존 모달 닫기 함수 수정
function closeCurrentModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

// 현재 블록 작업 공간의 데이터를 가져오는 함수
function getCurrentBlocklyData() {
    if (!window.workspace) return null;
    return Blockly.serialization.workspaces.save(workspace);
}

// 블록 작업 공간에 데이터 로드하는 함수
function loadBlocklyData(data) {
    if (!window.workspace || !data) return false;
    
    try {
        // 기존 블록 지우기
        workspace.clear();
        
        // 저장된 블록 불러오기
        Blockly.serialization.workspaces.load(data, workspace);
        return true;
    } catch (error) {
        console.error('블록 데이터 로드 오류:', error);
        return false;
    }
}

// 추가: 페이지 전환 시 프로젝트 로드 기능 강화
function showSection(sectionId) {
    console.log('섹션 전환:', sectionId);
    
    // 모든 섹션 숨기기
    document.querySelectorAll('.section').forEach(section => {
        if (section.style) {
            section.style.display = 'none';
        } else {
            section.setAttribute('style', 'display: none;');
        }
    });
    
    // 선택한 섹션 표시
    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        if (selectedSection.style) {
            selectedSection.style.display = '';
        } else {
            selectedSection.setAttribute('style', 'display: block;');
        }
        
        // 섹션 전환 시 추가 작업
        if (sectionId === 'playground-section') {
            // 플레이그라운드로 전환 시, 프로젝트 정보 표시
            const currentProject = projectManager.currentProject;
            if (currentProject) {
                document.getElementById('project-title').value = currentProject.title;
                document.getElementById('project-status').textContent = '로드됨';
                
                // Blockly 워크스페이스가 초기화되었는지 확인
                if (window.workspace && currentProject.blocks) {
                    // 저장된 블록 데이터 로드
                    loadBlocklyData(currentProject.blocks);
                }
            }
        } else if (sectionId === 'community-section') {
            // 커뮤니티로 전환 시, 게시물 로드
            uiHandlers.loadCommunityPosts('hot');
        } else if (sectionId === 'profile-section') {
            // 프로필로 전환 시, 사용자 정보 로드
            uiHandlers.loadUserProfile();
        } else if (sectionId === 'explore-section') {
            // 탐색으로 전환 시, 공개 프로젝트 로드
            const result = projectManager.getPublicProjects();
            if (result.success) {
                displayExploreProjects(result.projects);
            }
        }
    } else {
        console.error('섹션을 찾을 수 없음:', sectionId);
    }
    
    // 네비게이션 링크 업데이트
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
    });
    
    // 해당하는 네비게이션 링크 활성화
    const navId = sectionId.replace('-section', '');
    const navLink = document.getElementById(`nav-${navId}`);
    if (navLink) {
        navLink.classList.add('active');
    }
}