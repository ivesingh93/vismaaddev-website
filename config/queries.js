module.exports = {
    KATHAVAACHAKS: "select name from raagi where type = 'Kathavaachak' order by name",

    POPULAR_SHABADS: "select rrs.id, rrs.listeners, shabad.sathaayi_title as shabad_english_title, shabad_info.sathaayi_id, shabad_info.starting_id, shabad_info.ending_id, raagi.name as raagi_name, raagi.image_url, concat('https://s3.eu-west-2.amazonaws.com/vismaadnaad/Raagis/',raagi.name, '/', shabad.sathaayi_title, '.mp3') as shabad_url, to_char(rrs.length, 'MI:SS') as shabad_length from raagi_recording_shabad as rrs join shabad on rrs.shabad_id = shabad.id join shabad_info on shabad.shabad_info_id = shabad_info.id join recording on rrs.recording_id = recording.id join raagi on rrs.raagi_id = raagi.id order by rrs.listeners DESC limit $1",

    HOME_PAGE_RAAGI_INFO: "select row_number() over(order by raagi.name) as raagi_id, raagi.name as raagi_name, raagi.image_url as raagi_image_url, count(rrs.shabad_id) as shabads_count, to_char(sum(rrs.length), 'HH24:MI:SS') as total_length from raagi join raagi_recording_shabad as rrs ON raagi.id=rrs.raagi_id where rrs.status = 'PROD' group by raagi.id order by shabads_count desc limit 20",


    RAAGI_NAMES: "select name from raagi where type = 'Raagi' order by name",
    RECORDING_URLS: "select url from recording order by url",
    RECENT_RECORDINGS: "select title from recording order by date_added desc limit 20",

    RECENTLY_ADDED_SHABADS: "select rrs.id, r.name as raagi_name, r.image_url, s.sathaayi_title as shabad_english_title, shabad_info.sathaayi_id, shabad_info.starting_id, shabad_info.ending_id, concat('https://s3.eu-west-2.amazonaws.com/vismaadnaad/Raagis/',r.name, '/', s.sathaayi_title, '.mp3') as shabad_url, to_char(rrs.length, 'MI:SS') as shabad_length from raagi_recording_shabad as rrs join raagi as r on r.id = rrs.raagi_id join shabad as s on rrs.shabad_id = s.id join shabad_info on s.shabad_info_id = shabad_info.id where rrs.date_added between (now() - interval '7 day') and now() order by r.name",
    RAAGI_INFO: "select row_number() over(order by raagi.name) as raagi_id, raagi.name as raagi_name, raagi.image_url as raagi_image_url, count(rrs.shabad_id) as shabads_count, to_char(sum(rrs.length), 'HH24:MI:SS') as total_length from raargi join raagi_recording_shabad as rrs ON raagi.id=rrs.raagi_id where rrs.status = 'PROD' group by raagi.id",



    SHABADS: "select shabad.sathaayi_title as shabad_english_title, shabad_info.sathaayi_id, shabad_info.starting_id, shabad_info.ending_id, shabad_info.checked as shabad_checked from shabad join shabad_info on shabad.shabad_info_id = shabad_info.id order by shabad.sathaayi_title",
    SHABADS_BY_SATHAAYI_ID: "select shabad.id, shabad.sathaayi_title as shabad_english_title, shabad.shabad_info_id, shabad_info.sathaayi_id, shabad_info.starting_id, shabad_info.ending_id, shabad_info.checked from shabad join shabad_info on shabad.shabad_info_id = shabad_info.id where shabad_info.sathaayi_id=$1 order by shabad.sathaayi_title",
    SHABADS_BY_SATHAAYI_TITLE: "select * from shabad where sathaayi_title = $1",
    RAAGIS_RECORDINGS: "select distinct recording.title as recording_title from raagi_recording_shabad as rrs join recording on rrs.recording_id=recording.id where raagi_id=(SELECT ID from raagi where name=$1) order by recording.title",
    RAAGIS_RECORDINGS_INFO: "select distinct recording.title as recording_title, recording.url as recording_url, recording.date_added from raagi_recording_shabad as rrs join recording on rrs.recording_id=recording.id where raagi_id=(SELECT ID from raagi where name=$1) order by recording.title",
    RAAGIS_SHABADS: "select rrs.id, raagi.name as raagi_name, raagi.image_url as raagi_image_url, shabad.sathaayi_title as shabad_english_title, rrs.listeners, recording.title as recording_title, shabad_info.sathaayi_id, concat('https://s3.eu-west-2.amazonaws.com/vismaadnaad/Raagis/',raagi.name, '/', shabad.sathaayi_title, '.mp3') as shabad_url, shabad_info.starting_id, shabad_info.ending_id, to_char(rrs.length, 'MI:SS') as shabad_length, shabad_info.checked as shabad_checked, rrs.date_added from raagi_recording_shabad as rrs join shabad on rrs.shabad_id = shabad.id join shabad_info on shabad.shabad_info_id = shabad_info.id join raagi on rrs.raagi_id = raagi.id join recording on rrs.recording_id = recording.id where rrs.raagi_id=(select id from raagi where name=$1) and rrs.status='PROD' order by shabad.sathaayi_title",
    RAAGIS_RECORDINGS_SHABADS: "select shabad.sathaayi_title as shabad_english_title, recording.title as recording_title, shabad_info.sathaayi_id, shabad_info.starting_id, rrs.starting_time as shabad_starting_time, rrs.ending_time as shabad_ending_time, shabad_info.ending_id, to_char(rrs.length, 'MI:SS') as shabad_length, shabad_info.checked as shabad_checked from raagi_recording_shabad as rrs join shabad on rrs.shabad_id = shabad.id join shabad_info on shabad.shabad_info_id = shabad_info.id join recording on rrs.recording_id = recording.id where rrs.raagi_id=(select id from raagi where name = $1) and recording.title=$2 order by shabad.sathaayi_title",
    RECORDINGS_SHABADS: "select shabad.sathaayi_title as shabad_sathaayi_title from shabad join raagi_recording_shabad as rrs on shabad.id = rrs.shabad_id where rrs.recording_id=(select id from recording where title = $1) order by shabad.sathaayi_title",
    SHABADS_RAAGIS: "select raagi.name as raagi_name from shabad join raagi_recording_shabad as rrs on shabad.id = rrs.shabad_id join raagi on raagi.id = rrs.raagi_id where shabad.shabad_info_id = (select id from shabad_info where sathaayi_id = $1)",
    RECENT_RAAGIS: "select distinct raagi.name as raagi_name from raagi_recording_shabad as rrs join raagi on raagi.id = rrs.raagi_id where rrs.date_added between (now() - interval '7 day') and now()",
    SHABAD_TUTORIALS_ALL: "select shabad_tutorial.url, shabad_tutorial.title, shabad_tutorial.harmonium_scale, shabad_tutor.name as shabad_tutor, shabad.sathaayi_title, raagi.name as raagi_name from shabad_tutorial join shabad_tutor on shabad_tutorial.shabad_tutor_id = shabad_tutor.id join raagi_recording_shabad as rrs on rrs.id = shabad_tutorial.raagi_recording_shabad_id join shabad on rrs.shabad_id = shabad.id join raagi on rrs.raagi_id = raagi.id order by shabad_tutorial.date_added desc",
    SHABAD_TUTORIALS_LIMIT: "select shabad_tutorial.url, shabad_tutorial.title, shabad_tutorial.harmonium_scale, shabad_tutor.name as shabad_tutor, shabad.sathaayi_title, raagi.name as raagi_name from shabad_tutorial join shabad_tutor on shabad_tutorial.shabad_tutor_id = shabad_tutor.id join raagi_recording_shabad as rrs on rrs.id = shabad_tutorial.raagi_recording_shabad_id join shabad on rrs.shabad_id = shabad.id join raagi on rrs.raagi_id = raagi.id order by shabad_tutorial.date_added desc limit $1",
    SHABAD_LISTENERS_BY_ID: "select listeners from raagi_recording_shabad as rrs where rrs.id = $1",
    SHABAD_LISTENERS: "update raagi_recording_shabad set listeners = listeners + 1 where id = $1",
    ADD_RAAGI_RECORDING_INSERT_RAAGI: "INSERT INTO RAAGI (NAME, IMAGE_URL, type) VALUES ($1, $2, 'Raagi') ON CONFLICT (NAME) DO NOTHING RETURNING ID",
    ADD_RAAGI_RECORDING_SELECT_RAAGI: "SELECT ID FROM RAAGI WHERE NAME=$1",
    ADD_RAAGI_RECORDING_SELECT_NO_RECORDING : "SELECT ID FROM RECORDING WHERE URL = 'no_recording'",
    ADD_RAAGI_RECORDING_INSERT_RECORDING: "INSERT INTO RECORDING (TITLE, URL) VALUES ($1, $2) RETURNING ID",
    ADD_RAAGI_RECORDING_SELECT_RECORDING: "SELECT ID FROM RECORDING WHERE TITLE=$1",
    ADD_RAAGI_RECORDING_INSERT_SHABAD_INFO: "INSERT INTO SHABAD_INFO (SATHAAYI_ID, STARTING_ID, ENDING_ID, CHECKED) VALUES ($1, $2, $3, $4) ON CONFLICT (SATHAAYI_ID) DO NOTHING RETURNING ID",
    ADD_RAAGI_RECORDING_SELECT_SHABAD_INFO: "SELECT ID FROM SHABAD_INFO WHERE SATHAAYI_ID=$1",
    ADD_RAAGI_RECORDING_INSERT_SHABAD: "INSERT INTO SHABAD (SATHAAYI_TITLE, SHABAD_INFO_ID) VALUES ($1, $2) ON CONFLICT (SATHAAYI_TITLE) DO NOTHING RETURNING ID",
    ADD_RAAGI_RECORDING_SELECT_SHABAD: "SELECT ID FROM SHABAD WHERE SATHAAYI_TITLE=$1",
    ADD_RAAGI_RECORDING_INSERT_RAAGI_RECORDING_SHABAD: "INSERT INTO RAAGI_RECORDING_SHABAD (RAAGI_ID, RECORDING_ID, SHABAD_ID, STARTING_TIME, ENDING_TIME, LENGTH, STATUS, LIKES, DOWNLOADS, LISTENERS) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, 0)",
    SET_STATUS_TO_PROD: "update raagi_recording_shabad set status=$1 where recording_id=(select id from recording where title=$2) and raagi_id=(select id from raagi where name=$3)",
    CHANGE_SHABAD_TITLE: "update shabad set sathaayi_title=$1 where sathaayi_title=$2",
    CHANGE_STARTING_ID: "update shabad_info set starting_id=$1 where starting_id=$2",
    CHANGE_ENDING_ID: "update shabad_info set ending_id=$1 where ending_id=$2",
    UPDATE_SHABAD_INFO: "update shabad_info set checked=true where starting_id=$1 and ending_id=$2",
    TOTAL_SHABAD_LISTENERS: "select sum(listeners) as listeners from raagi_recording_shabad",

    ADD_FEEDBACK: "insert into feedback (feedback, member_id) values ($1, (select id from member where LOWER(username) LIKE LOWER($2)))",


    SIGNUP_EMAIL: "insert into member (account_id, username, password_hash, first_name, last_name, source_of_account) values ($1, $2, $3, $4, $5, $6)",
    SIGNUP_NO_EMAIL: "insert into member (account_id, username, first_name, last_name, source_of_account) values ($1, $2, $3, $4, $5)",
    AUTHENTICATE_EMAIL: "select account_id, password_hash, first_name, last_name, username from member where LOWER(account_id) LIKE LOWER($1) or LOWER(username) LIKE LOWER($2)",
    AUTHENTICATE_NO_EMAIL: "select account_id, first_name, last_name, username from member where LOWER(account_id) LIKE LOWER($1)",
    CREATE_PLAYLIST: "insert into playlist (name, member_id) values ($1, (select id from member where LOWER(username) LIKE LOWER($2)))",
    DELETE_PLAYLIST: "delete from playlist where name=$1 and member_id=(select id from member where LOWER(username) LIKE LOWER($2))",
    ADD_SHABADS: "insert into playlist_shabad (playlist_id, raagi_recording_shabad_id) values ((select id from playlist where member_id=(select id from member where LOWER(username) LIKE LOWER($1)) and name=$2), $3)",
    REMOVE_SHABADS: "delete from playlist_shabad where raagi_recording_shabad_id=$1 and playlist_id=(select id from playlist where member_id=(select id from member where LOWER(username) LIKE LOWER($2)) and name=$3)",
    LIKE_SHABAD: "insert into member_raagi_recording_shabad (raagi_recording_shabad_id, member_id) values ($1, (select id from member where LOWER(username) LIKE LOWER($2)))",
    LIKE_SHABAD_UPDATE_RAAGI_RECORDING_SHABAD: "update raagi_recording_shabad set likes = likes + 1 where id = $1",
    UNLIKE_SHABAD: "delete from member_raagi_recording_shabad where raagi_recording_shabad_id = $1 and member_id = (select id from member where LOWER(username) LIKE LOWER($2))",
    UNLIKE_SHABAD_UPDATE_RAAGI_RECORDING_SHABAD: "update raagi_recording_shabad set likes = likes - 1 where id = $1",
    SHABAD_LIKES: "select likes from raagi_recording_shabad as rrs where rrs.id = $1",
    MEMBERS_SHABAD_LIKES: "select * from member_raagi_recording_shabad where raagi_recording_shabad_id = $1 and member_id = (select id from member where LOWER(username) LIKE LOWER($2))",
    USERS_PLAYLISTS: "select playlist.name, count(ps.playlist_id) as shabads_count from playlist left join playlist_shabad as ps on playlist.id = ps.playlist_id where member_id=(select id from member where LOWER(username) LIKE LOWER($1)) group by playlist.name",
    USERS_PLAYLIST: "select rrs.id, raagi.name as raagi_name, recording.title as recording_title, shabad.sathaayi_title as shabad_english_title, rrs.listeners, concat('https://s3.eu-west-2.amazonaws.com/vismaadnaad/Raagis/',raagi.name, '/', shabad.sathaayi_title, '.mp3') as shabad_url, to_char(rrs.length, 'MI:SS') as shabad_length, shabad_info.sathaayi_id, shabad_info.starting_id, shabad_info.ending_id from playlist as p join playlist_shabad as ps on p.id = ps.playlist_id join raagi_recording_shabad as rrs on ps.raagi_recording_shabad_id = rrs.id join raagi on raagi.id = rrs.raagi_id join recording on recording.id = rrs.recording_id join shabad on rrs.shabad_id=shabad.id join shabad_info on shabad.shabad_info_id=shabad_info.id where p.member_id=(select id from member where LOWER(username) LIKE LOWER($1)) and p.name=$2 order by shabad.sathaayi_title",
};




























