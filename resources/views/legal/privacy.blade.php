<x-legal-page
    title="Privacy policy"
    description="What History Portal collects about teachers and students, why, who processes it, and how to have it deleted."
    updated="12 October 2026"
>
    <p>
        History Portal is made by The Learning Portal in the Netherlands. This page says what we
        collect when you use historyportal.eu, why we collect it, and what you can ask us to do with it.
        If something here is unclear, write to <a href="mailto:info@historyportal.eu">info@historyportal.eu</a>
        and you will get an answer from a person.
    </p>

    <h2>The short version</h2>
    <ul>
        <li>An account costs nothing. In return we ask who you are and what you teach, so we can build the right lessons.</li>
        <li>We do not sell your data, show ads, or use tracking or advertising cookies.</li>
        <li>Your class can play lessons without accounts. We never ask for a student's email address.</li>
        <li>You can download or delete your account and everything in it at any time.</li>
    </ul>

    <h2>Who is responsible</h2>
    <p>
        The Learning Portal, Korte Jufferstraat 42, 3512 EZ Utrecht, the Netherlands
        (KvK 57701105, VAT NL002200353B28), is the data controller for historyportal.eu.
        Contact: <a href="mailto:info@historyportal.eu">info@historyportal.eu</a>.
    </p>
    <p>
        When a school uses History Portal with its students, the school decides how its students
        use it. For student data we then act on the school's behalf, and we will sign a data
        processing agreement with any school that asks for one.
    </p>

    <h2>What we collect from teachers</h2>
    <ul>
        <li><strong>Account:</strong> your name, email address, and, if you sign in with Google, Microsoft or Apple, the account ID that service gives us. We never see your password for those services.</li>
        <li><strong>Profile:</strong> the answers you give when you join, such as country, type of school, age group, subjects and teaching language.</li>
        <li><strong>Your lessons:</strong> the text, images, audio and other files you upload or write, and the settings of your lessons and classes.</li>
        <li><strong>Use:</strong> which lessons you open, play and build, so we can see what works and fix what does not.</li>
        <li><strong>Where you came from:</strong> if you arrived through a link with a campaign tag (for example a post in a teacher group), we store that tag with your account.</li>
        <li><strong>Messages:</strong> anything you send us, such as feedback on a lesson.</li>
    </ul>

    <h2>What we collect from students</h2>
    <p>
        Students do not need an account. When they play a lesson we record, without their name, how far
        the lesson was played. When they take a quiz or join a class they enter a name to appear on the
        scoreboard; please ask your class to use a first name or a nickname. We store that name, their
        answers and their score, so you can see your class's results.
    </p>
    <p>
        Do not upload files that contain personal information about students (photos of students, names
        with grades, and so on). Lessons are teaching material, not student records.
    </p>

    <h2>Why we use it</h2>
    <ul>
        <li><strong>To run your account and your lessons.</strong> Without this the service does not work (performance of our agreement with you).</li>
        <li><strong>To send you the community email</strong> with free resources, teaching techniques and games, only if you tick the box for it. You can stop it with one click in every email (consent).</li>
        <li><strong>To improve History Portal</strong> and decide what to build next, using how lessons are played and built (our legitimate interest in making the product better for teachers).</li>
        <li><strong>To keep the service safe:</strong> stopping abuse, spam and break-in attempts (legitimate interest).</li>
        <li><strong>To ask you for feedback,</strong> for example a short call, only if you said yes to that.</li>
    </ul>
    <p>We send account emails you need (sign-in links, security notices) whether or not you join the community email.</p>

    <h2>Who else processes it</h2>
    <p>We use a small number of services to run History Portal. Each one only gets what it needs for its job.</p>
    <ul>
        <li><strong>SiteGround</strong> hosts the website, the database and our email.</li>
        <li><strong>Cloudinary</strong> stores and delivers lesson images.</li>
        <li><strong>Microsoft Azure</strong> and <strong>ElevenLabs</strong> turn lesson text into narration. They receive the lesson text, not who wrote it.</li>
        <li><strong>Google, Microsoft and Apple</strong> handle sign-in when you choose them.</li>
        <li><strong>AI providers</strong> (such as OpenAI and Anthropic) receive lesson text only when you use AI generation features. Free founding-teacher accounts do not include AI generation.</li>
    </ul>
    <p>
        Some of these companies are based outside the European Union. Where data leaves the EU, it is
        covered by the EU-US Data Privacy Framework or the European Commission's standard contractual clauses.
    </p>

    <h2>Cookies and storage</h2>
    <p>
        We use only the cookies the site needs to work: one that keeps you signed in and one that protects
        forms against forgery. Your browser also remembers a few interface choices, such as your language
        and text size. There are no analytics, advertising or social media cookies, so there is no cookie banner.
    </p>

    <h2>How long we keep it</h2>
    <ul>
        <li>Your account and lessons: until you delete them or ask us to.</li>
        {{-- TODO(founding-teachers step 1): users and lessons only SOFT-delete today. The 30-day promise
             needs a scheduled prune that force-deletes them (and their storage) 30 days after deletion. --}}
        <li>After deletion: gone from the live service within 30 days and from backups within 90 days.</li>
        {{-- demo:prune-guests runs hourly with config('demo.guest_ttl_hours') = 24. --}}
        <li>Try-it-yourself demo accounts (no sign-up): deleted automatically within 48 hours.</li>
        <li>Student quiz names and scores: as long as the lesson or class they belong to exists.</li>
    </ul>

    <h2>Your rights</h2>
    <p>
        You can ask us to show you the data we hold about you, correct it, delete it, give it to you in a
        file you can take elsewhere, or stop using it for a purpose you object to. You can withdraw consent
        for the community email at any time. Write to <a href="mailto:info@historyportal.eu">info@historyportal.eu</a>;
        we answer within one month.
    </p>
    <p>
        If you think we handle your data wrongly, you can complain to the Dutch data protection authority,
        the <a href="https://autoriteitpersoonsgegevens.nl" rel="noreferrer">Autoriteit Persoonsgegevens</a>,
        or the authority in your own country. We would like to hear from you first.
    </p>

    <h2>Changes</h2>
    <p>
        If we change what we collect or why, we update this page and change the date at the top. For
        changes that matter, we tell account holders by email before they take effect.
    </p>
</x-legal-page>
