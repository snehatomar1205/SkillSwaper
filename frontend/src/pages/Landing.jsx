
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const features = [
  {
    number: "01",
    title: "Discover Skills",
    description:
      "Explore skills shared by people and find someone who can teach what you want to learn.",
  },
  {
    number: "02",
    title: "Exchange Knowledge",
    description:
      "Send a learning request, connect with another user, and arrange your session.",
  },
  {
    number: "03",
    title: "Grow Together",
    description:
      "Complete sessions, earn time credits, collect XP, and unlock achievements.",
  },
];

const highlights = [
  {
    title: "Skill Exchange",
    description:
      "Teach what you know and learn something new from another member.",
    icon: "↔",
  },
  {
    title: "Time Credits",
    description:
      "Exchange knowledge using a time-based credit system instead of money.",
    icon: "◷",
  },
  {
    title: "Gamification",
    description:
      "Earn XP, progress through levels, unlock achievements, and climb leaderboards.",
    icon: "★",
  },
  {
    title: "Safe Exchanges",
    description:
      "Schedule sessions, communicate with partners, and access dispute resolution.",
    icon: "✓",
  },
];

const Landing = () => {
  return (
    <main className="min-h-screen overflow-hidden bg-white text-gray-900 dark:bg-slate-950 dark:text-white">
      {/* Public Navbar */}
      <header className="absolute left-0 right-0 top-0 z-50 px-5 py-5">
        <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-white/10 bg-white/80 px-5 py-3 shadow-lg backdrop-blur-xl dark:bg-slate-900/80">
          <Link
            to="/"
            className="text-2xl font-extrabold tracking-tight text-indigo-600 dark:text-indigo-400"
          >
            SkillSwap
          </Link>

          <div className="hidden items-center gap-8 text-sm font-medium text-gray-600 dark:text-gray-300 md:flex">
            <a href="#about" className="transition hover:text-indigo-500">
              About
            </a>
            <a href="#how-it-works" className="transition hover:text-indigo-500">
              How It Works
            </a>
            <a href="#features" className="transition hover:text-indigo-500">
              Features
            </a>
            <a href="#community" className="transition hover:text-indigo-500">
              Community
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-800 sm:inline-flex"
            >
              Login
            </Link>

            <Link
              to="/register"
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative isolate flex min-h-[760px] items-center overflow-hidden bg-slate-950 px-5 pb-20 pt-36 text-white">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.28),_transparent_50%),radial-gradient(ellipse_at_bottom_left,_rgba(14,165,233,0.16),_transparent_45%)]" />

        <div className="absolute right-[-100px] top-32 -z-10 h-80 w-80 rounded-full bg-indigo-600/20 blur-[100px]" />

        <div className="mx-auto grid w-full max-w-7xl items-center gap-16 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="inline-flex rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300">
              A community built on shared knowledge
            </span>

            <h1 className="mt-7 max-w-2xl text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
              Share a skill.
              <span className="block text-indigo-400">
                Learn something new.
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">
              Everyone knows something worth sharing. SkillSwap connects people
              who want to teach with people who want to learn, making knowledge
              exchange simple and rewarding.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                to="/register"
                className="rounded-xl bg-indigo-600 px-7 py-3.5 font-semibold text-white shadow-xl shadow-indigo-600/20 transition hover:-translate-y-1 hover:bg-indigo-500"
              >
                Start Learning →
              </Link>

              <Link
                to="/login"
                className="rounded-xl border border-slate-600 px-7 py-3.5 font-semibold text-white transition hover:border-indigo-400 hover:bg-white/5"
              >
                Explore Your Account
              </Link>
            </div>

            <div className="mt-12 flex flex-wrap gap-8 border-t border-slate-800 pt-7">
              <div>
                <p className="text-2xl font-bold text-white">Teach</p>
                <p className="mt-1 text-sm text-slate-400">
                  Share your expertise
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">Learn</p>
                <p className="mt-1 text-sm text-slate-400">
                  Discover new abilities
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">Grow</p>
                <p className="mt-1 text-sm text-slate-400">
                  Progress together
                </p>
              </div>
            </div>
          </motion.div>

          {/* Hero Illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative mx-auto w-full max-w-lg"
          >
            <div className="absolute inset-8 rounded-full bg-indigo-600/20 blur-3xl" />

            <div className="relative rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Your learning journey</p>
                  <h3 className="mt-1 text-2xl font-bold">Knowledge Exchange</h3>
                </div>
                <span className="rounded-xl bg-indigo-500/20 px-3 py-2 text-2xl text-indigo-300">
                  ↗
                </span>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-5">
                  <div className="text-3xl">💻</div>
                  <p className="mt-4 font-semibold">Teach Coding</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Share what you know
                  </p>
                </div>

                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-5">
                  <div className="text-3xl">🎨</div>
                  <p className="mt-4 font-semibold">Learn Design</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Discover something new
                  </p>
                </div>
              </div>

              <div className="my-6 flex items-center justify-center gap-4">
                <div className="h-px flex-1 bg-slate-700" />
                <span className="rounded-full border border-slate-700 px-4 py-2 text-sm text-indigo-300">
                  Knowledge goes both ways
                </span>
                <div className="h-px flex-1 bg-slate-700" />
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Your progress</p>
                    <p className="mt-1 text-xl font-bold">Keep Growing</p>
                  </div>
                  <div className="rounded-xl bg-indigo-500/20 px-4 py-3 text-indigo-300">
                    XP
                  </div>
                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-700">
                  <div className="h-full w-2/3 rounded-full bg-indigo-500" />
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Learn. Teach. Earn. Repeat.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="px-5 py-24">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
            About SkillSwap
          </p>

          <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl">
            Knowledge is better when it is shared.
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-gray-600 dark:text-gray-400">
            SkillSwap is a peer-to-peer learning platform where people exchange
            their abilities through time-based credits. You can teach a skill
            you already know and use the credits you earn to learn something
            from someone else.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="bg-gray-50 px-5 py-24 dark:bg-slate-900/60"
      >
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
              Simple process
            </p>
            <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl">
              How SkillSwap Works
            </h2>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Three steps to start exchanging knowledge.
            </p>
          </div>

          <div className="mt-16 grid gap-7 md:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.number}
                className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm transition hover:-translate-y-2 hover:shadow-xl dark:border-slate-700 dark:bg-slate-900"
              >
                <span className="text-4xl font-extrabold text-indigo-600/30 dark:text-indigo-400/40">
                  {feature.number}
                </span>
                <h3 className="mt-6 text-xl font-bold">{feature.title}</h3>
                <p className="mt-4 leading-7 text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-5 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
              Platform features
            </p>
            <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl">
              Everything you need to learn and teach.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {highlights.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-gray-200 bg-white p-6 transition hover:border-indigo-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-700"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-2xl text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                  {feature.icon}
                </div>
                <h3 className="mt-5 text-lg font-bold">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community CTA */}
      <section
        id="community"
        className="px-5 py-20"
      >
        <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-indigo-600 px-7 py-16 text-center text-white shadow-2xl shadow-indigo-600/20 sm:px-14">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-200">
            Your next skill starts here
          </p>

          <h2 className="mx-auto mt-5 max-w-3xl text-3xl font-extrabold sm:text-5xl">
            You have something to teach. Someone has something to share.
          </h2>

          <p className="mx-auto mt-6 max-w-2xl leading-7 text-indigo-100">
            Join SkillSwap and turn the knowledge you have into opportunities
            to learn, connect, and grow.
          </p>

          <Link
            to="/register"
            className="mt-9 inline-flex rounded-xl bg-white px-8 py-3.5 font-bold text-indigo-700 transition hover:-translate-y-1 hover:bg-indigo-50"
          >
            Join SkillSwap →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 px-5 py-10 dark:border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 sm:flex-row">
          <div>
            <Link
              to="/"
              className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400"
            >
              SkillSwap
            </Link>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Share knowledge. Build skills. Grow together.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
            <Link to="/login" className="hover:text-indigo-500">
              Login
            </Link>
            <Link to="/register" className="hover:text-indigo-500">
              Register
            </Link>
            <a href="#about" className="hover:text-indigo-500">
              About
            </a>
            <a href="#how-it-works" className="hover:text-indigo-500">
              How It Works
            </a>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-500">
            © {new Date().getFullYear()} SkillSwap
          </p>
        </div>
      </footer>
    </main>
  );
};

export default Landing;
