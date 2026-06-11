

# Inkly — Full-Stack Learning Roadmap
## From Zero to Production using Spring Boot + React

---

## How to use this document

Each section lists what to learn, why it matters for this project, and what you should be able to do after learning it. Follow the phases in order — each builds on the last.

---

# PHASE 1 — Java Fundamentals
> You cannot skip this. Everything else depends on it.

### 1.1 Core Java

**What to learn:**
- Primitive types, variables, operators
- Control flow: `if`, `for`, `while`, `switch`
- Methods: parameters, return types, overloading
- Arrays and basic data structures

**OOP (most important part):**
- Classes and objects
- Constructors
- `this` keyword
- Encapsulation: `private` fields + `public` getters/setters
- Inheritance: `extends`, method overriding, `super`
- Interfaces: `implements`, default methods
- Abstract classes
- Polymorphism

**Core Java features:**
- `String` methods (split, trim, contains, format)
- Collections: `List`, `ArrayList`, `Map`, `HashMap`, `Set`
- Generics: `List<String>`, `Map<String, Object>`
- Exception handling: `try/catch/finally`, custom exceptions, `throws`
- `Optional<T>` — used everywhere in Spring
- Enums

**Modern Java (Java 17+):**
- Lambda expressions: `list.stream().filter(x -> x.active)`
- Stream API: `map`, `filter`, `collect`, `findFirst`
- `var` keyword
- Records (immutable data classes)
- Switch expressions
- Text blocks

**Why it matters for Inkly:**  
Your Task, User, and KanbanColumn objects are Java classes. Filtering tasks by column, sorting by priority — all done with streams. Spring uses lambdas and generics heavily.

**You should be able to:**
- Write a `Task` class with fields, constructor, and getters/setters
- Filter a `List<Task>` to only get tasks in the "backlog" column
- Handle a `NullPointerException` gracefully

---

### 1.2 Build Tools — Maven

**What to learn:**
- What Maven does (dependency management, build lifecycle)
- `pom.xml` structure: `groupId`, `artifactId`, `version`
- Adding dependencies from Maven Central
- Build phases: `clean`, `compile`, `test`, `package`, `install`
- Maven plugins (Spring Boot plugin)
- Multi-module projects (advanced)

**Key commands:**
```bash
mvn clean install          # clean build
mvn spring-boot:run        # run the app
mvn test                   # run tests only
mvn package -DskipTests    # build JAR without running tests
```

**Why it matters:**  
You need Maven to pull in Spring Boot, Jackson, PostgreSQL driver, and every other library your project uses.

**You should be able to:**
- Add a new dependency to `pom.xml` and understand what version to pick
- Run the Spring Boot app from the terminal

---

# PHASE 2 — Databases
> Before learning Spring Data JPA, understand what it's doing for you.

### 2.1 SQL and PostgreSQL

**What to learn:**

**Basic SQL:**
- `CREATE TABLE`, `DROP TABLE`, `ALTER TABLE`
- Data types: `VARCHAR`, `TEXT`, `INTEGER`, `BOOLEAN`, `TIMESTAMP`, `DECIMAL`
- `INSERT INTO`, `SELECT`, `UPDATE`, `DELETE`
- `WHERE` clause, `ORDER BY`, `LIMIT`
- `AND`, `OR`, `NOT` in conditions

**Intermediate SQL:**
- Primary keys (`PRIMARY KEY`)
- Foreign keys (`FOREIGN KEY REFERENCES`)
- `JOIN` types: `INNER JOIN`, `LEFT JOIN`
- Aggregations: `COUNT`, `SUM`, `AVG`, `GROUP BY`, `HAVING`
- Indexes: why they exist and when to add them
- Transactions: `BEGIN`, `COMMIT`, `ROLLBACK`

**PostgreSQL specific:**
- Installing PostgreSQL and pgAdmin
- Creating a database and user
- `\d tablename` to inspect tables
- `SERIAL` and `BIGSERIAL` for auto-increment IDs
- JSON/JSONB column type (useful for tags)
- `pg_dump` for backups

**For Inkly, your tables will be:**
```
users     — id, name, email, password_hash, role, initials, color
tasks     — id, task_code, title, description, col, priority, progress, due_date, live
tags      — id, name, css_class
task_tags — task_id, tag_id  (join table)
task_assignees — task_id, user_id  (join table)
columns   — id, name, position
```

**You should be able to:**
- Write a query to get all tasks in the "backlog" column ordered by priority
- Write a JOIN to get tasks with their assignee names
- Understand what a foreign key constraint does

---

### 2.2 JDBC (brief — just to understand JPA)

**What to learn:**
- What JDBC is: the raw Java API for talking to databases
- `Connection`, `PreparedStatement`, `ResultSet`
- Why it's tedious (reason JPA exists)

**You don't need to write JDBC code** — but knowing what JPA does underneath helps you debug it.

---

# PHASE 3 — Spring Boot Core
> This is the heart of the backend.

### 3.1 What Spring Boot Is

**What to learn:**
- What the Spring Framework is (dependency injection container)
- What Spring Boot adds: auto-configuration, embedded server, opinionated defaults
- The Spring Boot starter pattern (`spring-boot-starter-web`, `spring-boot-starter-data-jpa`)
- `@SpringBootApplication` — what it does
- Application context and the bean lifecycle
- `application.properties` / `application.yml` — central config file
- Spring Boot DevTools for hot reload

**Dependency Injection — the core concept:**
- What a "bean" is
- `@Component`, `@Service`, `@Repository`, `@Controller` — how Spring finds them
- `@Autowired` — how Spring injects dependencies
- Constructor injection (preferred over field injection)
- Why DI makes testing easy

**Configuration:**
```properties
# application.properties for Inkly
server.port=8080
spring.datasource.url=jdbc:postgresql://localhost:5432/inkly
spring.datasource.username=postgres
spring.datasource.password=yourpassword
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
```

**You should be able to:**
- Create a Spring Boot project from scratch at start.spring.io
- Explain what `@Autowired` does and why it's useful
- Add a config property and read it with `@Value`

---

### 3.2 Spring Web — REST API

**What to learn:**

**Controllers:**
- `@RestController` — marks a class as a REST controller
- `@RequestMapping("/api/tasks")` — base URL prefix
- `@GetMapping`, `@PostMapping`, `@PutMapping`, `@DeleteMapping`, `@PatchMapping`
- `@PathVariable` — extract `/api/tasks/{id}`
- `@RequestParam` — extract `?col=backlog`
- `@RequestBody` — parse JSON from request body
- `ResponseEntity<T>` — control HTTP status codes

**Example for Inkly:**
```java
@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    @GetMapping
    public List<Task> getAll(@RequestParam(required = false) String col) {
        return col != null ? taskService.findByColumn(col) : taskService.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Task> getById(@PathVariable Long id) {
        return taskService.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Task> create(@RequestBody Task task) {
        return ResponseEntity.status(201).body(taskService.save(task));
    }

    @PatchMapping("/{id}/move")
    public Task move(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return taskService.moveToColumn(id, body.get("col"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        taskService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
```

**HTTP Status codes to know:**
- `200 OK` — success
- `201 Created` — resource created
- `204 No Content` — success, no body (DELETE)
- `400 Bad Request` — client sent invalid data
- `401 Unauthorized` — not logged in
- `403 Forbidden` — logged in but not allowed
- `404 Not Found` — resource doesn't exist
- `500 Internal Server Error` — server bug

**Exception handling:**
- `@ControllerAdvice` — global error handler
- `@ExceptionHandler` — handle specific exceptions
- Return proper error JSON with status codes

**JSON serialization with Jackson:**
- `@JsonProperty("taskCode")` — rename a field in JSON
- `@JsonIgnore` — exclude a field from JSON
- `@JsonInclude(NON_NULL)` — omit null fields
- Date formatting with `@JsonFormat`

**CORS:**
```java
@Configuration
public class CorsConfig {
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:3000"));
        config.setAllowedMethods(List.of("GET","POST","PUT","DELETE","PATCH","OPTIONS"));
        config.setAllowCredentials(true);
        config.setAllowedHeaders(List.of("*"));
        // ...
    }
}
```

**You should be able to:**
- Build all REST endpoints for Inkly's Task resource (CRUD + move + progress update)
- Return the right HTTP status for each scenario
- Handle a 404 with a proper error message JSON

---

### 3.3 Spring Data JPA

**What to learn:**

**JPA Entities:**
- `@Entity` — marks a class as a DB table
- `@Table(name = "tasks")` — specify table name
- `@Id` — marks the primary key
- `@GeneratedValue(strategy = GenerationType.IDENTITY)` — auto-increment
- `@Column(nullable = false, length = 255)` — column constraints
- `@Column(columnDefinition = "TEXT")` — for long text
- `@CreationTimestamp`, `@UpdateTimestamp` — auto timestamps

**Relationships:**
- `@ManyToOne` — many tasks belong to one column
- `@OneToMany` — one user has many tasks
- `@ManyToMany` — tasks have many assignees; users assigned to many tasks
- `@JoinTable` — define the join table for many-to-many
- `FetchType.LAZY` vs `FetchType.EAGER` — when to load related data

**For Inkly's Task entity:**
```java
@Entity
@Table(name = "tasks")
public class Task {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String taskCode;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String col;       // backlog, todo, progress, review, done
    private String priority;  // urgent, high, med, low
    private double progress;
    private boolean live;

    @ManyToMany
    @JoinTable(name = "task_assignees",
        joinColumns = @JoinColumn(name = "task_id"),
        inverseJoinColumns = @JoinColumn(name = "user_id"))
    private List<User> assignees = new ArrayList<>();

    @ManyToMany
    @JoinTable(name = "task_tags",
        joinColumns = @JoinColumn(name = "task_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id"))
    private List<Tag> tags = new ArrayList<>();

    @CreationTimestamp
    private LocalDateTime createdAt;
}
```

**Repositories:**
- `JpaRepository<Task, Long>` — gives you `save`, `findAll`, `findById`, `delete` for free
- Custom queries with method names: `findByCol(String col)`
- `@Query("SELECT t FROM Task t WHERE t.col = :col ORDER BY t.colOrder")` — JPQL
- `@Query(value = "SELECT * FROM tasks WHERE col = ?1", nativeQuery = true)` — raw SQL
- `Pageable` and `Page<T>` — for pagination

```java
@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByCol(String col);
    List<Task> findByColOrderByColOrderAsc(String col);
    Optional<Task> findByTaskCode(String taskCode);
    List<Task> findByAssigneesId(Long userId);
    long countByCol(String col);
}
```

**Service layer:**
- Why you need a service between controller and repository
- `@Service` annotation
- `@Transactional` — wrap operations in a DB transaction
- Business logic goes here, not in controllers or repositories

**You should be able to:**
- Define all Inkly entities with proper JPA annotations
- Write a repository with custom finder methods
- Write a service that moves a task to a different column transactionally

---

### 3.4 Spring Security — Authentication & Authorization

**What to learn:**

**Core concepts:**
- Authentication (who are you?) vs Authorization (what can you do?)
- Security filter chain — every request passes through it
- `UserDetails` and `UserDetailsService`
- Password encoding with `BCryptPasswordEncoder` — never store plain passwords
- `SecurityContext` — stores the current logged-in user

**Session-based auth (simpler, what Inkly needs):**
- `formLogin()` or custom login endpoint
- `HttpSession` — Spring manages sessions automatically
- `@AuthenticationPrincipal` — inject current user into controller

**JWT-based auth (more modern, stateless):**
- What a JWT token is (header.payload.signature)
- Generating a JWT on login
- Validating JWT on each request with a filter
- `io.jsonwebtoken:jjwt` library
- Storing JWT in `localStorage` or `HttpOnly cookie`

**Authorization:**
- `@PreAuthorize("hasRole('ADMIN')")` — method-level security
- `hasAuthority()` vs `hasRole()`
- Protecting endpoints in the security config

**For Inkly, you need:**
- `POST /api/auth/login` — validate email/password, return user + token/session
- `POST /api/auth/logout` — invalidate session
- `GET /api/auth/me` — return current user from session
- Protect all `/api/**` routes (except login) — require authentication

**You should be able to:**
- Implement a login endpoint that hashes and verifies passwords
- Return 401 for requests without a valid session/token
- Get the current logged-in user inside any controller

---

# PHASE 4 — Frontend

### 4.1 HTML

**What to learn:**
- Document structure: `<!DOCTYPE>`, `<html>`, `<head>`, `<body>`
- Semantic tags: `<main>`, `<nav>`, `<aside>`, `<section>`, `<article>`, `<header>`, `<footer>`
- Forms: `<form>`, `<input>`, `<button>`, `<select>`, `<textarea>`
- `<div>` and `<span>` for layout
- `id` and `class` attributes
- `<script>` and `<link>` for JS and CSS
- `data-*` attributes (used heavily in Inkly for themes)

---

### 4.2 CSS

**What to learn:**

**Basics:**
- Selectors: element, class (`.card`), id (`#root`), attribute (`[data-theme]`)
- Box model: `margin`, `padding`, `border`, `width`, `height`
- `display`: `block`, `inline`, `inline-block`, `none`
- `position`: `static`, `relative`, `absolute`, `fixed`, `sticky`
- Colors, fonts, units (`px`, `%`, `rem`, `em`, `vh`, `vw`)

**Layout:**
- Flexbox: `display: flex`, `flex-direction`, `justify-content`, `align-items`, `gap`, `flex-wrap`
- CSS Grid: `display: grid`, `grid-template-columns`, `grid-template-rows`, `grid-area`
- When to use Flexbox vs Grid

**Modern CSS:**
- CSS custom properties (variables): `--accent: oklch(0.55 0.13 250)` — used extensively in Inkly
- `calc()` for computed values
- `clamp()` for responsive values
- Pseudo-classes: `:hover`, `:focus`, `:active`, `:nth-child`
- Pseudo-elements: `::before`, `::after`
- Transitions and animations
- Media queries for responsive design
- `@layer` for cascade management

**Inkly-specific patterns to understand:**
- CSS custom properties for theming (`[data-theme="dark"]` overrides)
- `[data-density]` attribute-driven spacing
- OKLch color space for perceptually uniform colors
- Layered `box-shadow` for depth

**You should be able to:**
- Build the Inkly sidebar layout from scratch with Flexbox
- Create a light/dark theme toggle using CSS custom properties
- Make the Kanban columns scroll horizontally on small screens

---

### 4.3 JavaScript

**What to learn:**

**Core:**
- Variables: `let`, `const` (avoid `var`)
- Data types: string, number, boolean, null, undefined, object, array
- Functions: declarations, expressions, arrow functions
- Destructuring: `const { id, title } = task`
- Spread/rest: `[...tasks, newTask]`, `{ ...task, col: "done" }`
- Template literals: `` `Task ${task.id}` ``
- Optional chaining: `task?.assignees?.length`
- Nullish coalescing: `task.progress ?? 0`

**DOM:**
- `document.querySelector`, `querySelectorAll`
- `element.addEventListener("click", handler)`
- `element.classList.add/remove/toggle`
- `element.dataset` — access `data-*` attributes
- Creating and removing elements

**Async JavaScript:**
- `setTimeout`, `setInterval`
- Promises: `.then()`, `.catch()`, `.finally()`
- `async/await` — the modern way
- Error handling in async functions

**Fetch API — calling your Spring Boot backend:**
```javascript
// GET all tasks
const response = await fetch("http://localhost:8080/api/tasks");
const tasks = await response.json();

// POST a new task
const response = await fetch("http://localhost:8080/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "New Task", col: "backlog", priority: "med" }),
    credentials: "include"  // for session cookies
});

// PATCH — move task to another column
await fetch(`http://localhost:8080/api/tasks/${id}/move`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ col: "todo" }),
    credentials: "include"
});
```

**Browser APIs:**
- `localStorage.setItem/getItem` — used in Inkly for theme preferences
- `window.postMessage` — cross-frame messaging (in the tweaks panel)
- Drag and drop API (used in the Kanban board)
- `window.history` and URL management

---

### 4.4 React

**What to learn:**

**Fundamentals:**
- What React is: a UI library, not a framework
- JSX syntax and why it compiles to `React.createElement`
- Components: function components only (classes are outdated)
- Props: passing data down to child components
- State: `useState` — data that changes and triggers re-render
- The virtual DOM and reconciliation

**Hooks — the core of modern React:**
- `useState(initialValue)` — local component state
- `useEffect(fn, deps)` — side effects (fetch data, set up listeners)
- `useCallback(fn, deps)` — memoize functions passed as props
- `useMemo(fn, deps)` — memoize computed values
- `useRef` — access DOM elements directly
- `useContext` — consume shared context
- Custom hooks — extract reusable logic (like `useTweaks` in Inkly)

**Component patterns:**
- Lifting state up — share state between siblings via parent
- Controlled components — form inputs controlled by state
- Conditional rendering — `{condition && <Component />}`
- List rendering — `{tasks.map(t => <TaskCard key={t.id} task={t} />)}`
- Composition — passing JSX as `children`

**Data fetching in React:**
```javascript
function TaskBoard() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/tasks", { credentials: "include" })
            .then(r => r.json())
            .then(data => setTasks(data))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div>Loading...</div>;
    return <div>{tasks.map(t => <TaskCard key={t.id} task={t} />)}</div>;
}
```

**State management for larger apps:**
- `useContext` + `useReducer` — built-in, good for medium apps
- Zustand — lightweight, recommended for Inkly scale
- Redux Toolkit — for large apps with complex state

**React Router (for multi-page navigation):**
- `<BrowserRouter>`, `<Routes>`, `<Route path="/kanban" element={<Kanban />} />`
- `useNavigate()` — programmatic navigation
- `useParams()` — get `:id` from URL
- Protected routes — redirect to login if not authenticated

**Build tooling:**
- Vite — fast dev server and bundler (recommended)
- Create React App — older, slower, still works
- `npm run dev` — dev server with hot reload
- `npm run build` — production build to `dist/` folder

**You should be able to:**
- Replace `inkly-data.jsx` mock data with real `fetch` calls to your Spring Boot API
- Implement the login form so it calls `POST /api/auth/login`
- Build the Kanban board with drag-and-drop calling `PATCH /api/tasks/{id}/move`

---

# PHASE 5 — Connecting Frontend to Backend

### 5.1 REST API Design

**What to learn:**
- Resource naming conventions (nouns not verbs: `/tasks` not `/getTasks`)
- HTTP methods map to actions (GET=read, POST=create, PUT=replace, PATCH=partial update, DELETE=remove)
- Versioning: `/api/v1/tasks`
- Pagination: `?page=0&size=20`
- Filtering: `?col=backlog&priority=urgent`
- Sorting: `?sort=createdAt,desc`
- Standard error response shape:
```json
{
  "status": 404,
  "error": "Not Found",
  "message": "Task INK-241 not found",
  "timestamp": "2025-05-10T10:30:00"
}
```

---

### 5.2 API Documentation with Swagger/OpenAPI

**What to learn:**
- `springdoc-openapi` library — auto-generates docs from your code
- Accessing Swagger UI at `http://localhost:8080/swagger-ui.html`
- `@Operation`, `@ApiResponse`, `@Parameter` annotations
- Using Swagger UI to test your endpoints during development

**Why it matters:**  
When your React frontend and Spring Boot backend are separate, Swagger is your contract. You can test every endpoint before writing the frontend code.

---

### 5.3 Environment Configuration

**What to learn:**
- Spring profiles: `application-dev.properties`, `application-prod.properties`
- `-Dspring.profiles.active=prod` — activate a profile
- Environment variables for secrets: never hardcode DB passwords
- Frontend environment variables: `.env.local` → `VITE_API_URL=http://localhost:8080`
- Proxy setup in Vite to avoid CORS during development:
```javascript
// vite.config.js
export default {
    server: {
        proxy: {
            '/api': 'http://localhost:8080'
        }
    }
}
```

---

# PHASE 6 — Testing

### 6.1 Backend Testing

**Unit tests with JUnit 5 + Mockito:**
- `@Test` — mark a test method
- `assertEquals`, `assertTrue`, `assertThrows`
- Mockito: `@Mock`, `@InjectMocks`, `when(...).thenReturn(...)`
- Test your Service layer in isolation (mock the repository)

**Integration tests with Spring Boot Test:**
- `@SpringBootTest` — loads the full Spring context
- `@DataJpaTest` — loads only JPA layer (uses H2 in-memory DB)
- `@WebMvcTest` — loads only the web layer
- `MockMvc` — simulate HTTP requests without running a real server
- `TestRestTemplate` — for full integration tests

**What to test for Inkly:**
- `TaskService.moveToColumn()` — verify column changes and order updates
- `AuthService.login()` — verify correct user returned, wrong password rejected
- `POST /api/tasks` via MockMvc — verify 201 status and body
- `GET /api/tasks?col=backlog` — verify filtering works

---

### 6.2 Frontend Testing

**What to learn:**
- Jest — JavaScript test runner
- React Testing Library — test components as users use them
- `render`, `screen.getByText`, `fireEvent.click`, `waitFor`
- Mocking fetch with `jest.fn()` or `msw` (Mock Service Worker)

---

# PHASE 7 — Production

### 7.1 Docker and Containerization

**What to learn:**
- What Docker is: containerize your app so it runs the same everywhere
- `Dockerfile` for Spring Boot:
```dockerfile
FROM eclipse-temurin:21-jre
COPY target/inkly.jar app.jar
ENTRYPOINT ["java", "-jar", "/app.jar"]
```
- `docker-compose.yml` for running app + PostgreSQL together:
```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: inkly
      POSTGRES_PASSWORD: secret
  app:
    build: .
    ports:
      - "8080:8080"
    depends_on:
      - db
```
- `docker build`, `docker run`, `docker-compose up`
- Docker volumes for persistent DB data
- Docker Hub — push your image

---

### 7.2 Database Migrations with Flyway

**What to learn:**
- Why `spring.jpa.hibernate.ddl-auto=create` is dangerous in production (drops all data)
- Flyway: versioned SQL migration files
- File naming: `V1__create_users.sql`, `V2__create_tasks.sql`
- Flyway runs migrations automatically on startup
- `flyway:repair` when migrations go wrong
- Rolling back migrations (requires careful planning)

---

### 7.3 Security Hardening

**What to learn:**
- HTTPS — TLS certificates, redirect HTTP → HTTPS
- Let's Encrypt — free TLS certificates
- `HttpOnly` and `Secure` cookie flags (prevents JS from stealing session cookies)
- Rate limiting — prevent brute-force login attacks
- Input validation with Bean Validation:
```java
public class CreateTaskRequest {
    @NotBlank
    @Size(max = 200)
    private String title;

    @NotNull
    @Pattern(regexp = "backlog|todo|progress|review|done")
    private String col;
}
```
- SQL injection prevention (JPA parameterized queries handle this automatically)
- XSS prevention (React escapes output automatically)
- CSRF protection (Spring Security includes this)
- Secrets management: environment variables, not hardcoded credentials

---

### 7.4 Logging and Monitoring

**What to learn:**
- SLF4J + Logback (comes with Spring Boot)
- Log levels: `DEBUG`, `INFO`, `WARN`, `ERROR`
- Structured logging (JSON format for production)
- Spring Boot Actuator: `/actuator/health`, `/actuator/metrics`
- Application metrics: request count, response times, error rates
- Centralized logging: Loki + Grafana or ELK stack (advanced)

---

### 7.5 Deployment

**Cloud platforms:**
- **Railway** — simplest, great for student projects, supports Docker
- **Render** — free tier, supports Spring Boot + PostgreSQL
- **Fly.io** — good for Docker-based apps
- **AWS/GCP/Azure** — industry standard, more complex (learn after basics)

**What to learn for deployment:**
- Environment variables on the platform (DB URL, passwords)
- Health checks — the platform needs to know your app is alive
- Zero-downtime deploys (rolling deployments)
- Database connection pooling with HikariCP (comes with Spring Boot)

---

### 7.6 CI/CD with GitHub Actions

**What to learn:**
- What CI/CD means: code pushed → tests run → build → deploy automatically
- `.github/workflows/deploy.yml`:
```yaml
on:
  push:
    branches: [main]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '21'
      - run: mvn clean package -DskipTests
      - run: docker build -t inkly .
      # ... push to registry and deploy
```
- Running tests automatically on every pull request
- Secrets in GitHub Actions (DB password, deploy keys)

---

# PHASE 8 — Advanced Topics (After Launch)

These are not required to launch but make your app better:

### Performance
- Database query optimization — N+1 problem with JPA (use `JOIN FETCH`)
- Connection pooling configuration (HikariCP `maximum-pool-size`)
- Caching with Spring Cache + Redis (`@Cacheable`)
- Pagination — never return all tasks at once in production
- Frontend: lazy loading, code splitting with React.lazy

### Real-time Features
- WebSockets with Spring WebSocket — live Kanban updates when teammates move cards
- Server-Sent Events — simpler one-way real-time (for activity feed)
- STOMP protocol over WebSocket

### File Uploads
- `MultipartFile` in Spring for attachment uploads
- Storing files: AWS S3, Cloudflare R2, or MinIO
- Generating signed URLs for secure file access

### Search
- Full-text search in PostgreSQL with `tsvector` and `tsquery`
- Elasticsearch for advanced search (overkill for Inkly at first)

---

# Summary — Learning Order

```
Phase 1: Java + Maven          (4–6 weeks)
Phase 2: SQL + PostgreSQL      (2–3 weeks)
Phase 3: Spring Boot           (6–8 weeks)
    3.1 Core + DI
    3.2 REST API (Spring Web)
    3.3 Spring Data JPA
    3.4 Spring Security
Phase 4: Frontend              (6–8 weeks, can overlap with Phase 3)
    4.1 HTML
    4.2 CSS
    4.3 JavaScript
    4.4 React
Phase 5: API Integration       (1–2 weeks)
Phase 6: Testing               (2–3 weeks)
Phase 7: Production            (2–3 weeks)
    Docker → Flyway → Security → Deploy → CI/CD
Phase 8: Advanced              (ongoing)
```

**Total to first working version: ~3–4 months** (with consistent daily practice)  
**Total to production-quality: ~6–8 months**

---

## Recommended Resources

### Java & Spring Boot
- **Book:** *Spring Boot in Action* by Craig Walls
- **Course:** Amigoscode Spring Boot on YouTube (free)
- **Docs:** docs.spring.io (the official docs are excellent)
- **Practice:** spring.io/guides — small focused tutorials

### SQL
- **Site:** SQLZoo, Mode Analytics SQL Tutorial (free, interactive)
- **Book:** *Learning SQL* by Alan Beaulieu

### JavaScript & React
- **Site:** javascript.info — best JS reference (free)
- **Docs:** react.dev — official React docs with interactive examples
- **Course:** Scrimba React course

### Docker & Deployment
- **Docs:** docs.docker.com/get-started
- **Course:** TechWorld with Nana — Docker for beginners (YouTube, free)

### General Practice
- Build Inkly feature by feature — start with the Task CRUD API, then the Kanban frontend, then auth
- Every concept you learn, immediately apply it to Inkly
