# coding: utf-8
# Given cacheCalls.txt in this directory, compare the output against the data.


require 'json'


ROOTDIR = File.join(__dir__, '..', '..')


##################################
# Utils

# The cacheCalls file isn't actually valid json: we have to strip off
# a final comma, and put everything in [ ].
# Totally lazy hack.
def get_cachecalls_json()
  raw_content = File.read(File.join(__dir__, 'cacheCalls.txt'))
  actual = "[ #{raw_content} ]".gsub(",\n ]", "\n]")
  return JSON.parse(actual)
end

# Remove cruft from the cacheCalls data.
def clean_output(hsh)
  ret = hsh.clone
  if (ret['scraperPath'].nil?)
    raise hsh.inspect
  end
  ret['scraperPath'].gsub!(/^.*?src/, 'src')
  ret.delete('cacheFileExists')
  return ret
end


## CLEANUP UTILS

def delete_bad_json_files(unused_files)
  json = unused_files.select { |f| f =~ /json$/ }

  data = json.map do |f|
    content = File.read(File.join(ROOTDIR, f))
    stripContent = content.split("\n").map { |s| s.strip }.join("").gsub(' ', '')
    errMatch =
      (stripContent =~ /{"error":{"code":(499|403|400)/) ||
      (stripContent =~ /404: Not Found/)

    {
      filename: f,
      content: content,
      length: content.size,
      is_error: !errMatch.nil?
    }
  end

  data.sort! { |a, b| a[:length] <=> b[:length] }

  bad_json = data.select { |d| d[:is_error] }
  puts "\n# DELETE ERROR JSON FILES:"
  bad_json.each do |d|
    puts "git rm #{d[:filename]}"
  end
end


def delete_txt_files(unused_files)
  txt = unused_files.select { |f| f =~ /txt$/ }
  puts "\n# DELETE .txt FILES:"
  txt.each do |f|
    puts "git rm #{f}"
  end
end


def delete_bad_html_files(unused_files)
  html = unused_files.select { |f| f =~ /html$/ }

  data = html.map do |f|
    content = File.read(File.join(ROOTDIR, f))
    stripContent = content.split("\n").map { |s| s.strip }.join("").gsub(' ', '')
    errMatch =
      (stripContent =~ /Objectmoved/i) ||
      (stripContent =~ /DocumentMoved/i) ||
      (stripContent =~ /301MovedPermanently/i) ||
      (stripContent =~ /404: Not Found/)

    {
      filename: f,
      content: stripContent,
      length: stripContent.size,
      is_error: !errMatch.nil?
    }
  end

  data = data.sort { |a, b| a[:length] <=> b[:length] }

  # data.each do |d|
  #   puts '-' * 40
  #   puts d[:filename]
  #   puts d[:length]
  #   puts d[:content][0..100]
  # end
  
  bad_html = data.select { |d| d[:is_error] }
  puts "\n# DELETE BAD HTML FILES:"
  bad_html.each do |d|
    puts "git rm #{d[:filename]}"
  end
end


def delete_bad_csv_files(unused_files)
  files = unused_files.select { |f| f =~ /csv$/ }

  data = files.map do |f|
    content = File.read(File.join(ROOTDIR, f))
    stripContent = content.split("\n").map { |s| s.strip }.join("").gsub(' ', '')
    errMatch =
      (stripContent =~ /404:NotFound/i) ||
      (stripContent =~ /DocumentMoved/i) ||
      (stripContent =~ /"status":"Failed"/i) ||
      (stripContent =~ /"status":"queued","generating":{"csv":"queued"}/)

    {
      filename: f,
      content: content,
      length: content.size,
      is_error: !errMatch.nil?
    }
  end

  data = data.sort { |a, b| a[:length] <=> b[:length] }

  #  data.each do |d|
  #    puts '-' * 40
  #    puts d[:filename]
  #    puts d[:length]
  #    puts d[:content][0..100]
  #  end
  
  bad_files = data.select { |d| d[:is_error] }
  puts "\n# DELETE BAD CSV FILES:"
  bad_files.each do |d|
    puts "git rm #{d[:filename]}"
  end
end


#########################################################3
# Analysis

j = get_cachecalls_json()

jout =
  j.select { |h| h['cacheFilePath'] =~ /coronadatascraper-cache/ }.
    map { |h| clean_output(h) }
files_returned = jout.map { |h| h['cacheFilePath'] }.uniq.sort

# puts JSON.pretty_generate(jout)

cachedir = File.join(__dir__, '..', '..', 'coronadatascraper-cache')
files = []
Dir.chdir(cachedir) do
  files = Dir.glob(File.join('**', '*.*'))
end
all_files =
  files.
    map { |f| File.join("coronadatascraper-cache", f) }.
    uniq.
    sort

cache_hits = files_returned & all_files
unused_files = all_files - files_returned

puts "The following #{unused_files.size} files were NOT INCLUDED in cacheCalls.txt"
puts unused_files.map { |f| f.gsub(/coronadatascraper-cache\./, '') }
puts "End #{unused_files.size} files not included in cacheCalls.txt"

puts
puts "Same file name occurring more than once in unused files:"
fnames = unused_files.map { |f| f.split('/')[-1] }
counts = Hash.new(0)
fnames.each { |f| counts[f] += 1 }
counts = counts.to_a.select { |f, c| c > 1 }.sort { |a, b| a[1] <=> b[1] }.reverse
counts.each { |f, c| puts "#{'%02d' % c}: #{'% 38s' % f} (e.g. #{unused_files.map { |f| f.gsub(/coronadatascraper-cache\//, '') }.select{ |s| s =~ /#{f}/ }[0] })" }
puts


report = [
  "total files in cache:                           #{files.size}",
  "can be migrated:                                #{cache_hits.size}",
  "still unknown, unused during cache-only scrape:  #{unused_files.size}"
]
puts
report.each { |s| puts "  #{s}" }

################################################
# CACHE CLEANUP

puts "\n\n"
puts "=" * 55
puts "Suggested cache cleanup:"


puts "\n\n\n"
puts "# #{unused_files.size} unused"
delete_bad_json_files(unused_files)
delete_txt_files(unused_files)
delete_bad_html_files(unused_files)
delete_bad_csv_files(unused_files)
