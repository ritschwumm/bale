# 1.4.0

features
* allow leaving out globs in the bale command itself, in `--action` parameters and in script lines. and treat this case as match-all

# 1.3.0

changes
* renamed the `--debug` flag to `--verbose`
* improve performance by copying files in parallel
* copy timestamps of source files onto the target
* only check size and mtime of a file by default
* add a `--precise` option to revert to full file content comparison

# 1.2.0

features
* support `bale --action target:source:glob` syntax

# 1.1.0

changes
* enhance help string in `bale --help`

# 1.0.0

initial release
