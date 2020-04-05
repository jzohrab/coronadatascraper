# Hack all of the scraper files


LOCATION_RE = /(\s*)(city|county|state|country):/

# Some scraper files aren't really scrapers.
# Rather than try to determine these programmatically,
# just ignore specific ones.
IGNORE_FILES = %w(
AUS/_shared/get-data-with-tested-negative-applied.js
AUS/_shared/get-key.js
DEU/_shared.js
)


def validate(scraper_dir, f)
  fpath = File.join(scraper_dir, f)
  src = File.read(fpath)

  if (src !~ LOCATION_RE)
    raise "No match for #{LOCATION_RE} in #{f}"
  end
end


def add_filename_to_scraper_this(scraper_dir, f)
  fpath = File.join(scraper_dir, f)
  src = File.read(fpath)

  puts f
  m = src.match(LOCATION_RE)

  spaces = m[1].gsub("\n", '')
  loctype = m[2]

  add_code = "
#{spaces}_filepath: __filename,
#{spaces}#{loctype}:"

  src = src.sub(LOCATION_RE, add_code)
  puts src
end


########################################

scraper_dir = File.join(__dir__, '..', '..', 'src', 'shared', 'scrapers')

files = []
Dir.chdir(scraper_dir) do
  files = Dir.glob(File.join('**', '*.js'))
end
# puts "Pre remove count: #{files.count}"
files -= IGNORE_FILES
# puts "Post remove count: #{files.count}"

puts "#{files.size} scraper files."

# During dev, just do one file.
# add_filename_to_scraper_this(scraper_dir, files[0])

files.each do |f|
  validate(scraper_dir, f)
end
