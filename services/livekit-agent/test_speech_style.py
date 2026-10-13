from speech_style import humanize, number_words


def test_numbers():
    assert number_words(25000) == "twenty five thousand"
    assert number_words(150000) == "one lakh fifty thousand"


def test_money_and_units():
    out = humanize("2 BHK in Sector 57 under ₹30k/month, 1.5 km from metro. ₹1.5 Cr option too", allow_opener=False)
    assert "two B H K" in out and "thirty thousand rupees per month" in out
    assert "one point five kilometres" in out and "one point five crore rupees" in out
    assert "₹" not in out


def test_screen_artifacts_removed():
    out = humanize("**Top pick** (#2) 🏠 - details at https://x.io/a", allow_opener=False)
    assert "*" not in out and "http" not in out and "#" not in out and "🏠" not in out


def test_contractions_and_no_opener_on_greeting():
    assert humanize("I am here. Do not worry.", allow_opener=False) == "I'm here. Don't worry."
    assert humanize("Hello! I am your consultant.") == "Hello! I'm your consultant."


def test_facts_not_added():
    src = "I found 3 homes in Sector 57."
    assert "3 homes" in humanize(src, allow_opener=False)


def test_filler_only_transcripts_ignored():
    import sys, types
    sys.path.insert(0, ".")
    from transcript_filter import is_filler_only, TranscriptFilter

    assert is_filler_only("Hmm") and is_filler_only("okay okay") and is_filler_only("haan")
    assert not is_filler_only("okay show me two bhk") and not is_filler_only("yes I want to rent")
    f = TranscriptFilter()
    assert not f.accept("hmm") and f.accept("show me flats in sector 57")


def test_rewrite_safety_check():
    from voice_rewrite import is_safe_rewrite

    src = "I found 3 options in Sector 57 for ₹28k per month. Want to see them?"
    assert is_safe_rewrite(src, "Got it. I found 3 in Sector 57 at ₹28k a month. Want a look?", 320)
    assert not is_safe_rewrite(src, "I found 4 options in Sector 57.", 320)          # new number
    assert not is_safe_rewrite(src, "Call 9876543210 now!", 320)                    # new contact
    assert not is_safe_rewrite(src, "**Great** options!", 320)                      # markup
    assert not is_safe_rewrite("Here you go.", "Here you go. Anything else?", 320)  # invented question
    assert not is_safe_rewrite(src, "x " * 400, 320)                                 # too long


def test_rewrite_falls_back_on_failure():
    import asyncio
    from voice_rewrite import rewrite_for_speech

    class Boom:
        class chat:
            class completions:
                @staticmethod
                async def create(**_):
                    raise RuntimeError("quota")

    text = "I found three options in Sector 57. Do you want to see them now?"
    assert asyncio.run(rewrite_for_speech(Boom, text, lang="en", last_opener="", max_chars=320)) is None
    assert asyncio.run(rewrite_for_speech(None, text, lang="en", last_opener="", max_chars=320)) is None


def test_idle_watch_warns_then_ends_and_resets():
    from idle_watch import IdleWatch

    now = [0.0]
    w = IdleWatch(120, 150, clock=lambda: now[0])
    assert w.check() == "none"
    now[0] = 119
    assert w.check() == "none"
    now[0] = 121
    assert w.check() == "warn"
    assert w.check() == "none"  # warns only once
    now[0] = 140
    w.touch()  # visitor spoke: starts over
    now[0] = 150
    assert w.check() == "none"
    now[0] = 140 + 121
    assert w.check() == "warn"
    now[0] = 140 + 151
    assert w.check() == "end"


def test_idle_watch_not_idle_while_assistant_speaks():
    from idle_watch import IdleWatch

    now = [0.0]
    w = IdleWatch(120, 150, clock=lambda: now[0])
    w.busy(True)
    now[0] = 1000
    assert w.check() == "none"
    w.busy(False)  # finishing a reply counts as activity
    now[0] = 1100
    assert w.check() == "none"
    now[0] = 1000 + 151
    assert w.check() == "end"
