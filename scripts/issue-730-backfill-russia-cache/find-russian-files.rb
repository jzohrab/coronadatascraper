# coding: utf-8
# Finds all files in the cache containing russian characters,
# prints some analysis,
# prints some github commands to console, which should then be used on the cache.

require 'digest/md5'

CACHEDIR = File.join(__dir__, '..', '..', 'coronadatascraper-cache')
# puts CACHEDIR
# return

files = []
russian_files = []

def make_hash(f)
  {
    fullpath: File.join(CACHEDIR, f),
    date: f.split('/')[0],
    relpath: f,
    hexdigest: Digest::MD5.hexdigest(File.read(f))
  }
end


Dir.chdir(CACHEDIR) do
  files = Dir.glob(File.join('**', '*.*'))

  russian_chars = "населением"
  files =
    files.
      select { |f| f =~ /json$/ }.
      select { |f| File.read(f) =~ /[#{russian_chars}]/ }.
      map { |f| make_hash(f) }
end

# example = files[0].clone
# example.delete(:content)
# puts example


digests = files.map { |hsh| hsh[:hexdigest] }.sort.uniq
puts "#{digests.count} digests, #{files.count} files"

puts "\n\nFILES GROUPED BY DIGESTS:"
digests.each do |d|
  puts '-' * 40
  puts d
  puts files.select { |r| r[:hexdigest] == d }
  puts
end

puts "\n\nDIGESTS GROUPED BY DATES:"
date_digests = {}
files.map { |f| f[:date] }.sort.uniq. each do |dt|
  date_digests[dt] = files.select { |f| f[:date] == dt }.map { |f| f[:hexdigest] }.sort.uniq
end
date_digests.each_key do |dt|
  puts "#{dt}: #{date_digests[dt]}"
end

puts "\n\nDATES WHERE EACH DIGEST IS FOUND"
dg_dates = {}
files.map { |f| f[:hexdigest] }.sort.uniq. each do |dg|
  dg_dates[dg] = files.select { |f| f[:hexdigest] == dg }.map { |f| f[:date] }.sort.uniq
end
dg_dates.each_key do |dg|
  dates = dg_dates[dg]
  raise "Digest #{dg} found in multiple dates #{dates}" if (dates.length != 1)
  puts "#{dg}: #{dates}"
end

puts "\n\nDATES WITH >1 DIGEST:"
dates_with_multiple_digests = {}
date_digests.each_pair do |dt, dgs|
  if (dgs.size > 1) then
    dates_with_multiple_digests[dt] = dgs
  end
end
puts "#{'md5'.ljust(35)}#{'#'.ljust(5)}#{'sample'.ljust(30)}"
dates_with_multiple_digests.each_pair do |dt, dgs|
  puts "#{dt}:"
  dgs.each do |dg|
    all_files = files.select { |r| r[:hexdigest] == dg }
    puts "#{dg.ljust(35)}#{all_files.size.to_s.ljust(5)}#{all_files[0][:relpath].ljust(30)}"
  end
  puts
end

date_digests = {}
files.map { |f| f[:date] }.sort.uniq. each do |dt|
  dg_keys = files.select { |f| f[:date] == dt }.map { |f| f[:hexdigest] }.sort.uniq
  hsh = {}
  dg_keys.each do |dg|
    hsh[dg] = files.select { |f| f[:date] == dt && f[:hexdigest] == dg }.map { |f| f[:relpath] }
  end
  date_digests[dt] = hsh
end


# Determine what to do with each entry.
actions = []
date_digests.keys.each do |dt|
  dgs = date_digests[dt].keys
  if (dgs.count == 1) then
    dg = dgs[0]
    puts dt
    puts dg
    candidates = date_digests[dt][dg]
    actions << [:keep, candidates[0]]
    candidates[1..-1].each { |c| actions << [:discard, c] }
  else
    # Choosing the following special files for dates that have more
    # than one digest:
    keep = [
      '2020-4-1/a728f1b70ec618f43afbd3874e7a4f69.json',
      '2020-4-2/2028e345249ba35fab1cd4ffdc1e838d.json',
      '2020-4-3/891368865c5a565f8585ff7262c56256.json',
      '2020-4-6/5aee8f0cfd029d240d51721c6a48cc1b.json'
    ]
    dgs.each do |dg|
      puts dt
      puts dg
      candidates = date_digests[dt][dg]
      candidates.each do |c|
        if keep.include?(c) then
          actions << [:keep, c]
        else
          actions << [:discard, c]
        end
      end
    end
  end
end
puts actions

# Split up, generate git script.
discards = actions.select { |action, fname| action == :discard }
keeps = actions.select { |action, fname| action != :discard }

# Double-check
puts "Check: " + [files.size, discards.size, keeps.size].inspect
raise "Failed check" if (files.size != discards.size + keeps.size)


# CSRF token hashed file name: 
csrf_request_hashed_filename = "89f568b588147682c6bab1f349e5e6f4.json"
final_request_hashed_filename = "34f7e5d800fd897c41ca76188592e22f.json"
csrf_request_hashed_file_content = "{
  \"comment1\":\"FAKE TOKEN generated for Russian cache backfilling, GH issue 730\",
  \"comment2\":\"With this fake token, the ACTUAL url call cache filename is #{final_request_hashed_filename}\"
  \"csrfToken\":\"5a1c7218333fe6a612bf6cef50ae7d234f8f1880:1586462598\"
}"

# Add a fake CSRF request cached response, and rename the kept file so
# it is as if the request for it had used the fake CSRF cached file.
puts "\n\nFINAL SET OF GIT COMMANDS (run in coronadatascraper-cache) AND FILE WRITES:"
keeps.each do |action, filename|
  # puts filename
  d, f = filename.split('/')
  fake_csrf_fname = File.expand_path(File.join(CACHEDIR, d, csrf_request_hashed_filename))
  # puts fake_csrf_fname
  File.open(fake_csrf_fname, 'w') { |f| f.puts csrf_request_hashed_file_content }
  puts "git add #{fake_csrf_fname}   # fake csrf"
  puts "git mv #{filename} #{File.join(d, final_request_hashed_filename)}  # response"
end
discards.each do |action, filename|
  puts "git rm #{filename}  # unused"
end
