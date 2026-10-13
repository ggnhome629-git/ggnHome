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
