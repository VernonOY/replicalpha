# Support

Thanks for using replicalpha. Here's how to get help.

## Questions, ideas, general discussion

Open a thread in **[GitHub Discussions](https://github.com/VernonOY/replicalpha/discussions)**. Good for:

- "How do I use replicalpha with my own data source?"
- "Has anyone tried this on paper X?"
- "I'd love a feature that does Y"

## Bug reports

File a **[GitHub Issue](https://github.com/VernonOY/replicalpha/issues/new/choose)** using the bug report template. Please include:

- The exact command you ran
- The full error traceback (or a minimal repro)
- Python version (`python --version`)
- replicalpha version (`uv run replicalpha --version`)
- Whether you're using the bundled synthetic CSV or your own data

## Response time

This is a solo-maintained project — expect response within a few days for
bugs, longer for feature requests. I do read every issue and discussion.

## What I can't help with

- Custom integrations into proprietary data systems (Wind / Bloomberg auth,
  private quant platforms). The `DataAdapter` Protocol is the public
  extension point — implement it against your own source.
- Trading advice, strategy selection, or factor recommendations.
  replicalpha is a reproduction tool, not an investment adviser.

## Security issues

If you've found a security vulnerability, please do **not** open a public
issue. Contact me directly at **vernonoy@stanford.edu** with details.
